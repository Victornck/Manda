import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { query } from "../db.js";
import { mpConfigured, createPreference, createPreapproval, cancelPreapproval } from "../lib/mercadopago.js";
import { PLAN_PRICES_BRL, PLAN_LABELS } from "../lib/plans.js";
import { sendMail, refundEmailHtml, refundEmailText, refundAckHtml, refundAckText } from "../lib/mailer.js";
import { env } from "../env.js";

const r = Router();
r.use(requireAuth);

const schema = z.object({
  plan: z.enum(["basic", "pro", "business"]),
  interval: z.enum(["month", "year"]).optional().default("month"),
});

// Cria o checkout no Mercado Pago. O VALOR vem do servidor (PLAN_PRICES_BRL),
// nunca do cliente. O usuário escolhe Pix, cartão ou boleto na tela do MP.
// Cada pagamento aprovado libera um período (o webhook cuida da liberação).
r.post("/checkout", async (req, res, next) => {
  try {
    if (!mpConfigured()) return res.status(501).json({ error: "Pagamentos não configurados." });
    const { plan, interval } = schema.parse(req.body);
    const amount = PLAN_PRICES_BRL[plan]?.[interval];
    if (!amount) return res.status(400).json({ error: "Plano ou intervalo indisponível." });

    const { rows } = await query("select id, email from users where id=$1", [req.user.id]);
    const u = rows[0];
    const periodo = interval === "year" ? "anual" : "mensal";

    let pref;
    try {
      pref = await createPreference({
        title: `Manda ${PLAN_LABELS[plan]} (${periodo})`,
        amount,
        externalReference: `${u.id}:${plan}:${interval}`,
        metadata: { user_id: u.id, plan, interval },
        payerEmail: u.email,
        // A notificação do Checkout Pro chega por aqui (notification_url). A
        // confirmação real do pagamento é feita rebuscando na API do MP.
        notificationUrl: `${env.BACKEND_URL}/api/webhooks/mercadopago`,
        successUrl: `${env.APP_URL}/app?assinatura=ok`,
        pendingUrl: `${env.APP_URL}/app?assinatura=pendente`,
        failureUrl: `${env.APP_URL}/precos?assinatura=erro`,
      });
    } catch (e) {
      console.error("[mp checkout]", e?.message);
      return res.status(400).json({ error: `Mercado Pago: ${e?.message || "falha ao criar o checkout."}` });
    }
    // init_point é a URL do Checkout Pro (funciona com credenciais de produção e
    // de teste, desde que o comprador seja um usuário de teste).
    res.json({ url: pref.init_point });
  } catch (e) { next(e); }
});

// Assinatura com RENOVAÇÃO AUTOMÁTICA. Diferente do /checkout (avulso, libera 30
// dias por pagamento), aqui o Mercado Pago cobra sozinho a cada ciclo e avisa por
// webhook. O valor continua vindo do servidor, nunca do cliente.
r.post("/subscribe", async (req, res, next) => {
  try {
    if (!mpConfigured()) return res.status(501).json({ error: "Pagamentos não configurados." });
    const { plan, interval } = schema.parse(req.body);
    const amount = PLAN_PRICES_BRL[plan]?.[interval];
    if (!amount) return res.status(400).json({ error: "Plano ou intervalo indisponível." });

    const { rows } = await query("select id, email, mp_preapproval_id, subscription_kind from users where id=$1", [req.user.id]);
    const u = rows[0];
    if (u?.mp_preapproval_id && u.subscription_kind === "authorized") {
      return res.status(409).json({ error: "Você já tem uma assinatura automática ativa." });
    }

    let sub;
    try {
      sub = await createPreapproval({
        reason: `Manda ${PLAN_LABELS[plan]} (${interval === "year" ? "anual" : "mensal"})`,
        amount,
        externalReference: `${u.id}:${plan}:${interval}`,
        payerEmail: u.email,
        backUrl: `${env.APP_URL}/app?assinatura=ok`,
        frequency: 1,
        frequencyType: interval === "year" ? "years" : "months",
      });
    } catch (e) {
      console.error("[mp subscribe]", e?.message);
      return res.status(400).json({ error: `Mercado Pago: ${e?.message || "falha ao criar a assinatura."}` });
    }

    // Guarda o id já como "pending": o webhook confirma quando o cliente autoriza.
    await query("update users set mp_preapproval_id=$2, subscription_kind=$3 where id=$1",
      [u.id, String(sub.id), sub.status || "pending"]);
    res.json({ url: sub.init_point, id: sub.id });
  } catch (e) { next(e); }
});

// Cancelar a renovação automática. O acesso continua até o fim do período já
// pago (não tira o que o cliente comprou) — depois disso, ele simplesmente não
// é cobrado de novo e a conta cai em "aguardando pagamento".
r.post("/subscription/cancel", async (req, res, next) => {
  try {
    const { rows } = await query("select mp_preapproval_id from users where id=$1", [req.user.id]);
    const id = rows[0]?.mp_preapproval_id;
    if (!id) return res.status(404).json({ error: "Você não tem assinatura automática ativa." });
    try {
      await cancelPreapproval(id);
    } catch (e) {
      console.error("[mp cancel]", e?.message);
      return res.status(400).json({ error: "Não foi possível cancelar agora. Tente de novo em instantes." });
    }
    await query("update users set subscription_kind='cancelled' where id=$1", [req.user.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------------
// Pedido de reembolso, feito pelo próprio usuário dentro do app.
//
// Decreto 7.962/2013, art. 5, §1º: o direito de arrependimento tem que poder
// ser exercido "pela mesma ferramenta utilizada para a contratação". Como a
// pessoa assina aqui dentro, ela precisa poder pedir o reembolso aqui dentro.
// O §4º do mesmo artigo exige confirmação imediata do recebimento — por isso
// saem DOIS e-mails: um pro dono decidir e outro de confirmação pra pessoa.
//
// Este endpoint NÃO estorna nada e não mexe no acesso. Ele registra e avisa.
// O estorno é feito no painel do Mercado Pago, e quando ele acontece o webhook
// (refunded/charged_back) é quem encerra o período.
// ---------------------------------------------------------------------------
const refundSchema = z.object({
  reason: z.enum(["arrependimento", "nao_atendeu", "dificuldade", "cobranca_indevida", "outro"]),
  message: z.string().trim().max(2000).optional().default(""),
});

const DAY_MS = 86400000;

r.post("/refund-request", async (req, res, next) => {
  try {
    const { reason, message } = refundSchema.parse(req.body);
    const uid = req.user.id;

    const [{ rows: urows }, { rows: prows }, { rows: crows }] = await Promise.all([
      query("select name, email, plan from users where id=$1", [uid]),
      query(`select id, plan, interval, amount, created_at from mp_payments
              where user_id=$1 and status='approved' order by created_at desc limit 1`, [uid]),
      query(`select count(*)::int as total,
                    count(*) filter (where status <> 'draft')::int as enviadas,
                    count(*) filter (where status = 'accepted')::int as aceitas
               from proposals where user_id=$1`, [uid]),
    ]);
    const u = urows[0];
    if (!u) return res.status(404).json({ error: "Conta não encontrada." });

    // Um pedido aberto por vez: evita enxurrada de e-mail no clique repetido.
    const { rows: dup } = await query(
      "select id from refund_requests where user_id=$1 and status='aberto' and created_at > now()-interval '7 days' limit 1",
      [uid]
    );
    if (dup.length) {
      return res.status(409).json({ error: "Você já tem um pedido de reembolso em análise. Responderemos em até 5 dias." });
    }

    const pay = prows[0] || null;
    const paidAt = pay?.created_at ? new Date(pay.created_at) : null;
    // Art. 49 do CDC: 7 dias corridos contados da contratação. Dentro da janela,
    // a devolução é obrigatória e integral — não é decisão comercial.
    const withinRegret = !!paidAt && (Date.now() - paidAt.getTime()) <= 7 * DAY_MS;

    await query(
      `insert into refund_requests(user_id, payment_id, reason, message, plan, amount, paid_at, within_regret)
       values($1,$2,$3,$4,$5,$6,$7,$8)`,
      [uid, pay?.id || null, reason, message, pay?.plan || u.plan || "", pay?.amount || 0, paidAt, withinRegret]
    );

    const fmtDate = (d) => (d ? d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "");
    const c = crows[0] || {};
    const payload = {
      reason, message, fromEmail: u.email, fromName: u.name,
      planLabel: PLAN_LABELS[pay?.plan || u.plan] || (pay?.plan || u.plan || ""),
      amountStr: pay ? `R$ ${Number(pay.amount).toFixed(2).replace(".", ",")}${pay.interval === "year" ? " (anual)" : ""}` : "sem pagamento registrado",
      paidStr: fmtDate(paidAt),
      withinRegret,
      usedStr: `${c.total || 0} proposta(s) criada(s), ${c.enviadas || 0} enviada(s), ${c.aceitas || 0} aceita(s)`,
      dateStr: fmtDate(new Date()),
    };

    // O e-mail pro dono é o que importa: se ele falhar, o pedido falha (a pessoa
    // tenta de novo). O de confirmação é best-effort, não derruba a requisição.
    await sendMail({
      to: env.SMTP_USER || env.EMAIL_FROM,
      subject: `[Manda] Pedido de reembolso de ${u.email}${withinRegret ? " (dentro dos 7 dias)" : ""}`,
      html: refundEmailHtml(payload),
      text: refundEmailText(payload),
      replyTo: u.email || undefined,
    });

    try {
      await sendMail({
        to: u.email,
        subject: "Recebemos seu pedido de reembolso",
        html: refundAckHtml({ name: u.name, reason, dateStr: payload.dateStr, withinRegret }),
        text: refundAckText({ name: u.name, reason, dateStr: payload.dateStr, withinRegret }),
      });
    } catch (e) {
      console.error("[reembolso] confirmação pro usuário falhou:", e?.message);
    }

    res.status(201).json({ ok: true, withinRegret });
  } catch (e) { next(e); }
});

export default r;
