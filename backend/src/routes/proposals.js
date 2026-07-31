import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";
import { env } from "../env.js";
import { requireAuth } from "../middleware/auth.js";
import { writeLimiter, emailSendLimiter } from "../middleware/rateLimit.js";
import { proposalSchema, statusSchema } from "../lib/validate.js";
import { publicId } from "../lib/ids.js";
import { PLAN_LIMITS, templateAllowed } from "../lib/plans.js";
import { getFreshAccess } from "../lib/googleAccount.js";
import { buildRawEmail, sendGmail } from "../lib/googleMail.js";
import { proposalEmailHtml, proposalEmailText, followUpEmailHtml, followUpEmailText } from "../lib/mailer.js";

const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const emailProposalSchema = z.object({
  to: z.string().email().optional(),
  subject: z.string().trim().max(160).optional(),
  message: z.string().trim().max(2000).optional(),
});

const r = Router();
r.use(requireAuth); // tudo aqui exige login

// Plano EFETIVO: admin tem acesso total (equivale a business, ilimitado),
// independente de pagamento no Mercado Pago.
const getPlan = async (userId) => {
  const { rows } = await query("select plan, role from users where id=$1", [userId]);
  if (rows[0]?.role === "admin") return "business";
  return rows[0]?.plan || "free";
};

const sumItems = (items = []) =>
  items.filter((it) => !it.hidden) // itens ocultos não entram no total
    .reduce((a, it) => a + (parseInt(String(it.value || "").replace(/\D/g, ""), 10) || 0), 0);

const toProposal = (p) => ({
  id: p.id, publicId: p.public_id, client: p.client, company: p.company, clientEmail: p.client_email,
  title: p.title, scope: p.scope, items: p.items, start: p.start_date, end: p.end_date,
  payment: p.payment, revisions: p.revisions, validity: p.validity, bio: p.bio,
  accent: p.accent, accent2: p.accent2, gradient: p.gradient, theme: p.theme, watermark: p.watermark, logo: p.logo, cover: p.cover,
  template: p.template, status: p.status, value: Number(p.value),
  createdAt: p.created_at, updatedAt: p.updated_at,
});

// Lista: devolve so o RESUMO (sem escopo/itens/bio/estilo/imagens), pra reduzir
// muito o egress do banco. O conteudo completo vem em GET /:id ao abrir a proposta.
r.get("/", async (req, res, next) => {
  try {
    const { rows } = await query(
      "select id, public_id, client, company, client_email, title, status, value, created_at, updated_at from proposals where user_id=$1 order by created_at desc",
      [req.user.id]
    );
    res.json({
      proposals: rows.map((p) => ({
        id: p.id, publicId: p.public_id, client: p.client, company: p.company, clientEmail: p.client_email,
        title: p.title, status: p.status, value: Number(p.value), createdAt: p.created_at, updatedAt: p.updated_at,
      })),
    });
  } catch (e) { next(e); }
});

// Painel financeiro. Definido antes de /:id para não conflitar na rota.
r.get("/stats", async (req, res, next) => {
  try {
    const { rows } = await query("select client, company, status, value, created_at from proposals where user_id=$1", [req.user.id]);
    const num = (v) => Number(v) || 0;
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const receita = rows.filter((x) => x.status === "accepted" && new Date(x.created_at) >= monthStart).reduce((a, x) => a + num(x.value), 0);
    const emAberto = rows.filter((x) => ["sent", "viewed"].includes(x.status)).reduce((a, x) => a + num(x.value), 0);
    const enviadas = rows.filter((x) => x.status !== "draft").length;
    const aceitas = rows.filter((x) => x.status === "accepted").length;
    const conversao = enviadas ? Math.round((aceitas / enviadas) * 100) : 0;
    const map = {};
    rows.forEach((x) => {
      const k = (x.client || "Sem cliente").trim() || "Sem cliente";
      if (!map[k]) map[k] = { client: k, company: x.company || "", count: 0, value: 0, opened: false, accepted: 0 };
      const g = map[k];
      g.count += 1;
      g.value += num(x.value);
      if (["viewed", "accepted", "declined"].includes(x.status)) g.opened = true;
      if (x.status === "accepted") g.accepted += 1;
      if (!g.company && x.company) g.company = x.company;
    });
    res.json({ kpis: { receita, emAberto, enviadas, aceitas, conversao }, clients: Object.values(map).sort((a, b) => b.value - a.value) });
  } catch (e) { next(e); }
});

// Uso do mês x limite do plano (para "propostas restantes"). Conta o append-only.
r.get("/usage", async (req, res, next) => {
  try {
    const plan = await getPlan(req.user.id);
    const limit = (PLAN_LIMITS[plan] || PLAN_LIMITS.free).proposalsPerMonth;
    const { rows } = await query(
      "select count(*)::int as n from proposal_usage where user_id=$1 and created_at >= date_trunc('month', now())",
      [req.user.id]
    );
    res.json({ used: rows[0]?.n || 0, limit: limit === Infinity ? null : limit, plan });
  } catch (e) { next(e); }
});

// Notificações: interações reais do cliente (visualizou/aceitou/recusou).
// Definido antes de /:id para não conflitar na rota.
r.get("/notifications", async (req, res, next) => {
  try {
    const { rows } = await query(
      `select e.id, e.type, e.created_at, p.client, p.title, p.public_id
         from proposal_events e
         join proposals p on p.id = e.proposal_id
        where p.user_id = $1 and e.type in ('viewed','accepted','declined')
        order by e.created_at desc
        limit 50`,
      [req.user.id]
    );
    res.json({
      notifications: rows.map((n) => ({
        id: n.id, type: n.type, client: n.client, title: n.title, publicId: n.public_id, createdAt: n.created_at,
      })),
    });
  } catch (e) { next(e); }
});

// Follow-up assistido: propostas que foram ENVIADAS por e-mail pelo app, já têm
// alguns dias, seguem em aberto (enviada/vista, não aceita/recusada) e ainda não
// foram lembradas recentemente. Definido antes de /:id para não conflitar.
r.get("/follow-ups", async (req, res, next) => {
  try {
    const { rows } = await query(
      `select p.id, p.public_id, p.client, p.title, p.client_email, p.status, e.created_at as sent_at
         from proposals p
         join proposal_events e on e.proposal_id = p.id and e.type = 'emailed'
        where p.user_id = $1
          and p.status in ('sent','viewed')
          and e.created_at <= now() - interval '3 days'
          and (p.reminded_at is null or p.reminded_at <= now() - interval '3 days')
        order by e.created_at asc
        limit 20`,
      [req.user.id]
    );
    const day = 86400000;
    res.json({
      followUps: rows.map((f) => ({
        id: f.id, publicId: f.public_id, client: f.client, title: f.title,
        clientEmail: f.client_email, sentAt: f.sent_at, viewed: f.status === "viewed",
        daysSince: Math.max(1, Math.floor((Date.now() - new Date(f.sent_at).getTime()) / day)),
      })),
    });
  } catch (e) { next(e); }
});

r.get("/:id", async (req, res, next) => {
  try {
    const { rows } = await query("select * from proposals where id=$1 and user_id=$2", [req.params.id, req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: "Proposta não encontrada." });
    res.json({ proposal: toProposal(rows[0]) });
  } catch (e) { next(e); }
});

r.post("/", writeLimiter, async (req, res, next) => {
  try {
    const d = proposalSchema.parse(req.body);
    // Regras de acesso do plano
    const plan = await getPlan(req.user.id);
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
    if (!templateAllowed(plan, d.template)) {
      return res.status(402).json({ error: "Seu plano não inclui este template." });
    }
    // Cota mensal: conta o USO append-only (proposal_usage), que NÃO diminui ao
    // apagar uma proposta. Assim não dá pra burlar apagando e recriando.
    if (limits.proposalsPerMonth !== Infinity) {
      const { rows: c } = await query(
        "select count(*)::int as n from proposal_usage where user_id=$1 and created_at >= date_trunc('month', now())",
        [req.user.id]
      );
      if ((c[0]?.n || 0) >= limits.proposalsPerMonth) {
        return res.status(402).json({
          error: plan === "free"
            ? "Assine um plano para criar propostas."
            : `Você atingiu o limite de ${limits.proposalsPerMonth} propostas neste mês.`,
        });
      }
    }
    const { rows } = await query(
      `insert into proposals (user_id, public_id, client, company, client_email, title, scope, items, start_date, end_date, payment, revisions, validity, bio, accent, accent2, gradient, template, value, logo, cover, theme, watermark)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) returning *`,
      [req.user.id, publicId(), d.client, d.company, d.clientEmail, d.title, d.scope, JSON.stringify(d.items), d.start, d.end, d.payment, d.revisions, d.validity, d.bio, d.accent, d.accent2, d.gradient, d.template, sumItems(d.items), d.logo, d.cover, d.theme, d.watermark]
    );
    // Registra o uso (append-only). Nunca é apagado ao excluir a proposta.
    await query("insert into proposal_usage (user_id) values ($1)", [req.user.id]).catch(() => {});
    res.status(201).json({ proposal: toProposal(rows[0]) });
  } catch (e) { next(e); }
});

r.put("/:id", writeLimiter, async (req, res, next) => {
  try {
    const d = proposalSchema.parse(req.body);
    const plan = await getPlan(req.user.id);
    if (!templateAllowed(plan, d.template)) {
      return res.status(402).json({ error: "Seu plano não inclui este template." });
    }
    // Proposta concluída é imutável: só rascunho pode ser editado. Impede reusar
    // a mesma proposta/link para vários clientes ou alterar o que o cliente já viu.
    const cur = await query("select status from proposals where id=$1 and user_id=$2", [req.params.id, req.user.id]);
    if (!cur.rows[0]) return res.status(404).json({ error: "Proposta não encontrada." });
    if (cur.rows[0].status !== "draft") {
      return res.status(409).json({ error: "Esta proposta já foi enviada e não pode ser editada. Crie uma nova." });
    }
    const { rows } = await query(
      `update proposals set client=$3, company=$4, client_email=$5, title=$6, scope=$7, items=$8, start_date=$9, end_date=$10, payment=$11, revisions=$12, validity=$13, bio=$14, accent=$15, accent2=$16, gradient=$17, template=$18, value=$19, logo=$20, cover=$21, theme=$22, watermark=$23, updated_at=now()
       where id=$1 and user_id=$2 returning *`,
      [req.params.id, req.user.id, d.client, d.company, d.clientEmail, d.title, d.scope, JSON.stringify(d.items), d.start, d.end, d.payment, d.revisions, d.validity, d.bio, d.accent, d.accent2, d.gradient, d.template, sumItems(d.items), d.logo, d.cover, d.theme, d.watermark]
    );
    if (!rows[0]) return res.status(404).json({ error: "Proposta não encontrada." });
    res.json({ proposal: toProposal(rows[0]) });
  } catch (e) { next(e); }
});

r.patch("/:id/status", async (req, res, next) => {
  try {
    const { status } = statusSchema.parse(req.body);
    const { rows } = await query("update proposals set status=$3, updated_at=now() where id=$1 and user_id=$2 returning *", [req.params.id, req.user.id, status]);
    if (!rows[0]) return res.status(404).json({ error: "Proposta não encontrada." });
    res.json({ proposal: toProposal(rows[0]) });
  } catch (e) { next(e); }
});

// Envia a proposta por e-mail PELO GMAIL do próprio usuário (Gmail API). O "De"
// que chega ao cliente é o e-mail real dele. Exige conta Google conectada.
r.post("/:id/send-email", emailSendLimiter, async (req, res, next) => {
  try {
    const { to, subject, message } = emailProposalSchema.parse(req.body || {});
    const { rows } = await query("select * from proposals where id=$1 and user_id=$2", [req.params.id, req.user.id]);
    const p = rows[0];
    if (!p) return res.status(404).json({ error: "Proposta não encontrada." });
    if (p.status === "draft") return res.status(409).json({ error: "Conclua a proposta antes de enviar por e-mail." });

    const dest = String(to || p.client_email || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(dest)) {
      return res.status(400).json({ error: "Informe um e-mail de destino válido." });
    }

    // Apenas 1 e-mail por proposta. Checagem rápida (mensagem amigável); a
    // garantia REAL contra cliques simultâneos é o índice único, abaixo.
    const already = await query("select 1 from proposal_events where proposal_id=$1 and type='emailed' limit 1", [p.id]);
    if (already.rows[0]) {
      return res.status(409).json({ error: "Esta proposta já foi enviada por e-mail ao cliente.", alreadySent: true });
    }

    const { rows: urows } = await query("select name from users where id=$1", [req.user.id]);
    const senderName = urows[0]?.name || "";

    let access;
    try {
      access = await getFreshAccess(req.user.id);
    } catch (err) {
      if (err.needsConnect) return res.status(409).json({ error: err.message, needsConnect: true });
      throw err;
    }

    // RESERVA o envio ANTES de mandar: o índice único (uniq_emailed_per_proposal)
    // faz o 2º clique simultâneo falhar aqui, então nunca sai um segundo e-mail.
    let claimId;
    try {
      const ins = await query(
        "insert into proposal_events(proposal_id,type,meta) values($1,'emailed',$2) returning id",
        [p.id, JSON.stringify({ to: dest })]
      );
      claimId = ins.rows[0].id;
    } catch (err) {
      if (err.code === "23505") {
        return res.status(409).json({ error: "Esta proposta já foi enviada por e-mail ao cliente.", alreadySent: true });
      }
      throw err;
    }

    const link = `${env.APP_URL}/p/${p.public_id}`;
    const subj = (subject && subject.trim()) || `Proposta: ${p.title || "para você"}`;
    const common = { senderName, clientName: p.client, title: p.title, link, message };
    const raw = buildRawEmail({
      fromName: senderName, fromEmail: access.email, to: dest, subject: subj,
      html: proposalEmailHtml(common), text: proposalEmailText(common),
    });

    try {
      await sendGmail(access.accessToken, raw);
    } catch (err) {
      // Falhou o envio: desfaz a reserva para o usuário poder tentar de novo.
      await query("delete from proposal_events where id=$1", [claimId]).catch(() => {});
      if (err.status === 401 || err.status === 403) {
        return res.status(409).json({ error: "O Google recusou o envio. Reconecte sua conta Gmail.", needsConnect: true });
      }
      console.error("[send-email]", err.message);
      return res.status(502).json({ error: "Não foi possível enviar agora. Tente de novo em instantes." });
    }

    if (!p.client_email && dest) {
      query("update proposals set client_email=$2 where id=$1", [p.id, dest]).catch(() => {});
    }
    res.json({ ok: true, to: dest, from: access.email });
  } catch (e) { next(e); }
});

// Follow-up assistido: envia um LEMBRETE pelo Gmail do usuário (clique dele).
// Diferente do primeiro envio: não usa o evento 'emailed' (que é único por
// proposta), apenas marca reminded_at para dar cooldown e sumir da lista.
r.post("/:id/remind", emailSendLimiter, async (req, res, next) => {
  try {
    const { rows } = await query("select * from proposals where id=$1 and user_id=$2", [req.params.id, req.user.id]);
    const p = rows[0];
    if (!p) return res.status(404).json({ error: "Proposta não encontrada." });
    if (!["sent", "viewed"].includes(p.status)) {
      return res.status(409).json({ error: "Só dá para lembrar propostas enviadas e ainda em aberto." });
    }
    const dest = String(p.client_email || "").trim().toLowerCase();
    if (!emailRe.test(dest)) {
      return res.status(400).json({ error: "Não há e-mail do cliente para enviar o lembrete." });
    }
    // Cooldown de 2 dias: evita enviar lembrete atrás de lembrete.
    if (p.reminded_at && (Date.now() - new Date(p.reminded_at).getTime()) < 2 * 86400000) {
      return res.status(429).json({ error: "Você já enviou um lembrete recentemente. Aguarde um pouco." });
    }

    let access;
    try {
      access = await getFreshAccess(req.user.id);
    } catch (err) {
      if (err.needsConnect) return res.status(409).json({ error: err.message, needsConnect: true });
      throw err;
    }

    const { rows: urows } = await query("select name from users where id=$1", [req.user.id]);
    const senderName = urows[0]?.name || "";
    const link = `${env.APP_URL}/p/${p.public_id}`;
    const common = { senderName, clientName: p.client, title: p.title, link };
    const raw = buildRawEmail({
      fromName: senderName, fromEmail: access.email, to: dest,
      subject: `Lembrete: ${p.title || "sua proposta"}`,
      html: followUpEmailHtml(common), text: followUpEmailText(common),
    });

    try {
      await sendGmail(access.accessToken, raw);
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        return res.status(409).json({ error: "O Google recusou o envio. Reconecte sua conta Gmail.", needsConnect: true });
      }
      console.error("[remind]", err.message);
      return res.status(502).json({ error: "Não foi possível enviar agora. Tente de novo em instantes." });
    }

    await query("update proposals set reminded_at=now() where id=$1", [p.id]);
    res.json({ ok: true, to: dest, from: access.email });
  } catch (e) { next(e); }
});

r.delete("/:id", async (req, res, next) => {
  try {
    const { rowCount } = await query("delete from proposals where id=$1 and user_id=$2", [req.params.id, req.user.id]);
    if (!rowCount) return res.status(404).json({ error: "Proposta não encontrada." });
    res.status(204).end();
  } catch (e) { next(e); }
});

export default r;
