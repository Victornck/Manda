import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";
import { env } from "../env.js";
import { requireAuth } from "../middleware/auth.js";
import { writeLimiter, emailSendLimiter } from "../middleware/rateLimit.js";
import { proposalSchema, statusSchema } from "../lib/validate.js";
import { publicId } from "../lib/ids.js";
import { getRates, convertWith } from "../lib/rates.js";
import { normalizeCurrency } from "../lib/currency.js";
import { PLAN_LIMITS, templateAllowed, proposalCap, hasFeature, FEATURES, isSuspended } from "../lib/plans.js";
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

// Conta do usuário: plano EFETIVO (admin tem acesso total, equivale a business),
// se a assinatura está suspensa (vencida + carência) e a âncora do ciclo de cota.
const getAccount = async (userId) => {
  const { rows } = await query(
    "select plan, role, subscription_status, current_period_end, quota_anchor from users where id=$1",
    [userId]
  );
  const u = rows[0] || {};
  return {
    plan: u.role === "admin" ? "business" : (u.plan || "free"),
    suspended: isSuspended(u),
    anchor: u.quota_anchor || null,
    periodEnd: u.current_period_end || null,
  };
};
const getPlan = async (userId) => (await getAccount(userId)).plan;

// Resposta padrão quando a assinatura venceu: a conta fica só-leitura até o
// pagamento entrar. Não rebaixa pra grátis nem apaga nada.
const SUSPENDED_ERROR = {
  suspended: true,
  error: "Sua assinatura venceu. Renove para voltar a criar e enviar propostas.",
};

// Uso append-only do plano. No teto vitalício (grátis) conta tudo; no mensal,
// conta a partir do início do ciclo ATUAL da assinatura — o "aniversário" da
// quota_anchor (assinou dia 20 → vira todo dia 20). Assim a sobra não acumula
// nem o cliente ganha cota dobrada quando o mês do calendário vira no meio do
// ciclo. Sem âncora (conta antiga/grátis), mantém o mês do calendário.
const countUsage = async (userId, cap, anchor) => {
  if (cap.scope === "total") {
    const { rows } = await query("select count(*)::int as n from proposal_usage where user_id=$1", [userId]);
    return rows[0]?.n || 0;
  }
  const { rows } = await query(
    `select count(*)::int as n from proposal_usage
      where user_id=$1
        and created_at >= case
          when $2::timestamptz is null then date_trunc('month', now())
          -- least(ancora, now()) blinda contra ancora no futuro (dado ruim/legado):
          -- sem isso o inicio do ciclo cairia adiante e a cota nunca contaria.
          else least($2::timestamptz, now()) + make_interval(months =>
                 (extract(year from age(now(), least($2::timestamptz, now())))::int * 12)
                 + extract(month from age(now(), least($2::timestamptz, now())))::int)
        end`,
    [userId, anchor]
  );
  return rows[0]?.n || 0;
};

const sumItems = (items = []) =>
  items.filter((it) => !it.hidden) // itens ocultos não entram no total
    .reduce((a, it) => a + (parseInt(String(it.value || "").replace(/\D/g, ""), 10) || 0), 0);

const toProposal = (p) => ({
  id: p.id, publicId: p.public_id, client: p.client, company: p.company, clientEmail: p.client_email,
  title: p.title, scope: p.scope, items: p.items, start: p.start_date, end: p.end_date,
  payment: p.payment, revisions: p.revisions, validity: p.validity, bio: p.bio,
  accent: p.accent, accent2: p.accent2, gradient: p.gradient, theme: p.theme, watermark: p.watermark, logo: p.logo, cover: p.cover, coverPos: p.cover_pos || "",
  template: p.template, status: p.status, value: Number(p.value), currency: p.currency || "BRL",
  createdAt: p.created_at, updatedAt: p.updated_at,
});

// Lista: devolve so o RESUMO (sem escopo/itens/bio/estilo/imagens), pra reduzir
// muito o egress do banco. O conteudo completo vem em GET /:id ao abrir a proposta.
r.get("/", async (req, res, next) => {
  try {
    const { rows } = await query(
      "select id, public_id, client, company, client_email, title, status, value, currency, created_at, updated_at from proposals where user_id=$1 order by created_at desc",
      [req.user.id]
    );
    res.json({
      proposals: rows.map((p) => ({
        id: p.id, publicId: p.public_id, client: p.client, company: p.company, clientEmail: p.client_email,
        title: p.title, status: p.status, value: Number(p.value), currency: p.currency || "BRL", createdAt: p.created_at, updatedAt: p.updated_at,
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

// Uso x limite do plano (para "propostas restantes"). Conta o append-only. No
// Gratuito o teto é vitalício (scope "total"); nos pagos, do mês corrente.
r.get("/usage", async (req, res, next) => {
  try {
    const acc = await getAccount(req.user.id);
    const cap = proposalCap(acc.plan);
    const used = await countUsage(req.user.id, cap, acc.anchor);
    res.json({
      used, limit: cap.limit === Infinity ? null : cap.limit, scope: cap.scope, plan: acc.plan,
      suspended: acc.suspended, periodEnd: acc.periodEnd,
    });
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
    // Recurso premium: bloqueia no backend (não basta esconder no menu).
    if (!hasFeature(await getPlan(req.user.id), FEATURES.FOLLOW_UP)) {
      return res.status(402).json({ error: "O follow-up assistido está nos planos pagos.", upgrade: true });
    }
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

// Home / painel inicial: agrega tudo numa resposta só, com dados REAIS de
// propostas + eventos. Definido antes de /:id para não conflitar na rota.
r.get("/dashboard", async (req, res, next) => {
  try {
    const uid = req.user.id;
    const num = (v) => Number(v) || 0;
    // Janela do gráfico (7/30/90/365 dias). Só afeta a série temporal; o resto
    // dos KPIs olha o total/mês. Preso a limites seguros pra não virar consulta pesada.
    const days = Math.min(365, Math.max(7, parseInt(req.query.days, 10) || 30));

    // Moeda de exibição: ?display= (troca rápida no dashboard) ou a moeda da conta.
    // Todos os valores monetários são convertidos para ela com a cotação atual.
    const ucur = await query("select currency from users where id=$1", [uid]);
    const display = normalizeCurrency(req.query.display || ucur.rows[0]?.currency || "BRL");
    const { rates, updatedAt, stale } = await getRates("BRL");
    const conv = (amount, from) => convertWith(rates, amount, from || "BRL", display);

    const [counts, funil, tempo, ativos, serie, templates, atividade, emNego, ticket, quentes] = await Promise.all([
      query(`select
          count(*) filter (where created_at >= date_trunc('month', now())) as criadas_mes,
          count(*) filter (where created_at >= date_trunc('month', now()-interval '1 month')
                             and created_at <  date_trunc('month', now())) as criadas_mes_ant,
          count(*) filter (where status <> 'draft') as enviadas_total,
          count(*) filter (where status = 'accepted') as aceitas_total
        from proposals where user_id=$1`, [uid]),
      query(`select
          count(*) filter (where status='draft')    as rascunho,
          count(*) filter (where status='sent')     as enviada,
          count(*) filter (where status='viewed')   as visualizada,
          count(*) filter (where status='accepted') as aceita,
          count(*) filter (where status='declined') as recusada
        from proposals where user_id=$1`, [uid]),
      query(`select coalesce(avg(extract(epoch from (e.created_at - p.created_at))/86400),0) as dias
        from proposal_events e join proposals p on p.id=e.proposal_id
        where p.user_id=$1 and e.type='accepted'`, [uid]),
      query(`select count(distinct coalesce(nullif(trim(client),''),'—')) as n
        from proposals where user_id=$1 and created_at >= now()-interval '30 days'`, [uid]),
      query(`select to_char(created_at::date,'YYYY-MM-DD') as dia, count(*)::int as n
        from proposals where user_id=$1 and created_at >= now()-make_interval(days => $2)
        group by 1 order by 1`, [uid, days]),
      query(`select template, count(*)::int as total, count(*) filter (where status='accepted')::int as aceitas
        from proposals where user_id=$1 group by template order by aceitas desc, total desc`, [uid]),
      query(`select e.type, e.created_at, p.client, p.title, p.public_id
        from proposal_events e join proposals p on p.id=e.proposal_id
        where p.user_id=$1 and e.type in ('viewed','accepted','declined','emailed')
        order by e.created_at desc limit 8`, [uid]),
      // Valores monetários vêm agrupados POR MOEDA; a conversão pra moeda de
      // exibição acontece aqui no Node, com a cotação atual.
      query(`select currency, coalesce(sum(value) filter (where status in ('sent','viewed')),0) as v
        from proposals where user_id=$1 group by currency`, [uid]),
      query(`select currency, coalesce(sum(value) filter (where value>0),0) as s,
               count(*) filter (where value>0)::int as n
        from proposals where user_id=$1 group by currency`, [uid]),
      // Clientes quentes por (cliente, moeda). O join com eventos é agregado por
      // proposta (lateral) pra não inflar o valor; a junção por cliente e a
      // conversão de moeda acontecem no Node logo abaixo.
      query(`select coalesce(nullif(trim(p.client),''),'Sem cliente') as client, p.currency,
               coalesce(sum(p.value) filter (where p.status in ('sent','viewed')),0) as em_negociacao,
               coalesce(sum(ev.views),0)::int as views,
               max(ev.last_view) as ultima_abertura
        from proposals p
        left join lateral (
          select count(*) filter (where e.type='viewed') as views,
                 max(e.created_at) filter (where e.type='viewed') as last_view
          from proposal_events e where e.proposal_id=p.id
        ) ev on true
        where p.user_id=$1 group by 1,2`, [uid]),
    ]);

    const c = counts.rows[0] || {};
    const f = funil.rows[0] || {};
    const enviadasTotal = num(c.enviadas_total);
    const aceitasTotal = num(c.aceitas_total);

    // Em negociação: soma das parcelas de cada moeda, já convertidas.
    const emNegociacao = emNego.rows.reduce((a, r) => a + conv(num(r.v), r.currency), 0);
    // Ticket médio: soma dos valores convertidos / total de propostas com valor.
    const ticketSoma = ticket.rows.reduce((a, r) => a + conv(num(r.s), r.currency), 0);
    const ticketN = ticket.rows.reduce((a, r) => a + num(r.n), 0);

    // Clientes quentes: junta as moedas por cliente (convertendo cada parcela),
    // depois filtra, ordena e corta em 5.
    const hotMap = new Map();
    for (const r of quentes.rows) {
      const g = hotMap.get(r.client) || { client: r.client, emNegociacao: 0, views: 0, ultimaAbertura: null };
      g.emNegociacao += conv(num(r.em_negociacao), r.currency);
      g.views += num(r.views);
      if (r.ultima_abertura && (!g.ultimaAbertura || new Date(r.ultima_abertura) > new Date(g.ultimaAbertura))) g.ultimaAbertura = r.ultima_abertura;
      hotMap.set(r.client, g);
    }
    const clientesQuentes = [...hotMap.values()]
      .filter((g) => g.views > 0 || g.emNegociacao > 0)
      .sort((a, b) => b.views - a.views || b.emNegociacao - a.emNegociacao)
      .slice(0, 5)
      .map((g) => ({ client: g.client, emNegociacao: Math.round(g.emNegociacao), views: g.views, ultimaAbertura: g.ultimaAbertura }));

    res.json({
      moeda: { display, atualizadaEm: updatedAt, desatualizada: stale },
      kpis: {
        emNegociacao: Math.round(emNegociacao),
        criadasMes: num(c.criadas_mes),
        criadasMesAnt: num(c.criadas_mes_ant),
        taxaAceitacao: enviadasTotal ? Math.round((aceitasTotal / enviadasTotal) * 100) : 0,
        clientesAtivos: num(ativos.rows[0]?.n),
        tempoMedioAceite: Math.round(num(tempo.rows[0]?.dias) * 10) / 10,
        valorMedio: ticketN ? Math.round(ticketSoma / ticketN) : 0,
      },
      funil: {
        rascunho: num(f.rascunho), enviada: num(f.enviada), visualizada: num(f.visualizada),
        aceita: num(f.aceita), recusada: num(f.recusada),
      },
      serie: serie.rows.map((s) => ({ dia: s.dia, n: s.n })),
      templates: templates.rows.map((t) => ({
        template: t.template, total: t.total, aceitas: t.aceitas,
        conversao: t.total ? Math.round((t.aceitas / t.total) * 100) : 0,
      })),
      atividade: atividade.rows.map((a) => ({
        type: a.type, client: a.client, title: a.title, publicId: a.public_id, createdAt: a.created_at,
      })),
      clientesQuentes,
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
    const acc = await getAccount(req.user.id);
    const plan = acc.plan;
    if (acc.suspended) return res.status(402).json(SUSPENDED_ERROR);
    if (!templateAllowed(plan, d.template)) {
      return res.status(402).json({ error: "Seu plano não inclui este template." });
    }
    // Cota de propostas: conta o USO append-only (proposal_usage), que NÃO diminui
    // ao apagar uma proposta (não dá pra burlar apagando e recriando). O Gratuito
    // tem teto VITALÍCIO (scope "total"); os pagos renovam a cada ciclo pago.
    const cap = proposalCap(plan);
    if (cap.limit !== Infinity) {
      const used = await countUsage(req.user.id, cap, acc.anchor);
      if (used >= cap.limit) {
        return res.status(402).json({
          error: cap.scope === "total"
            ? `Você já usou suas ${cap.limit} propostas grátis. Assine um plano para criar mais.`
            : `Você atingiu o limite de ${cap.limit} propostas deste ciclo. Ele renova na próxima cobrança.`,
          limitReached: true,
        });
      }
    }
    const { rows } = await query(
      `insert into proposals (user_id, public_id, client, company, client_email, title, scope, items, start_date, end_date, payment, revisions, validity, bio, accent, accent2, gradient, template, value, logo, cover, theme, watermark, currency, cover_pos)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25) returning *`,
      [req.user.id, publicId(), d.client, d.company, d.clientEmail, d.title, d.scope, JSON.stringify(d.items), d.start, d.end, d.payment, d.revisions, d.validity, d.bio, d.accent, d.accent2, d.gradient, d.template, sumItems(d.items), d.logo, d.cover, d.theme, d.watermark, d.currency, d.coverPos]
    );
    // Registra o uso (append-only). Nunca é apagado ao excluir a proposta.
    await query("insert into proposal_usage (user_id) values ($1)", [req.user.id]).catch(() => {});
    res.status(201).json({ proposal: toProposal(rows[0]) });
  } catch (e) { next(e); }
});

r.put("/:id", writeLimiter, async (req, res, next) => {
  try {
    const d = proposalSchema.parse(req.body);
    const acc = await getAccount(req.user.id);
    if (acc.suspended) return res.status(402).json(SUSPENDED_ERROR);
    if (!templateAllowed(acc.plan, d.template)) {
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
      `update proposals set client=$3, company=$4, client_email=$5, title=$6, scope=$7, items=$8, start_date=$9, end_date=$10, payment=$11, revisions=$12, validity=$13, bio=$14, accent=$15, accent2=$16, gradient=$17, template=$18, value=$19, logo=$20, cover=$21, theme=$22, watermark=$23, currency=$24, cover_pos=$25, updated_at=now()
       where id=$1 and user_id=$2 returning *`,
      [req.params.id, req.user.id, d.client, d.company, d.clientEmail, d.title, d.scope, JSON.stringify(d.items), d.start, d.end, d.payment, d.revisions, d.validity, d.bio, d.accent, d.accent2, d.gradient, d.template, sumItems(d.items), d.logo, d.cover, d.theme, d.watermark, d.currency, d.coverPos]
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
    if ((await getAccount(req.user.id)).suspended) return res.status(402).json(SUSPENDED_ERROR);
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
    const acc = await getAccount(req.user.id);
    if (acc.suspended) return res.status(402).json(SUSPENDED_ERROR);
    if (!hasFeature(acc.plan, FEATURES.FOLLOW_UP)) {
      return res.status(402).json({ error: "O follow-up assistido está nos planos pagos.", upgrade: true });
    }
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
