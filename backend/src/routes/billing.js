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
const REGRET_DAYS = 7; // art. 49 do CDC

// ELEGIBILIDADE de reembolso — fonte unica da regra, usada tanto pela tela
// (GET /refund-eligibility) quanto pela abertura do pedido (POST). A validacao
// mora no servidor: esconder o botao no front nao impede ninguem de chamar o
// endpoint direto, entao e aqui que o pedido sem lastro e barrado.
//
// So existe reembolso do que foi PAGO. A referencia e o ultimo pagamento
// aprovado em mp_payments (pendente, recusado, estornado e contestado nao
// entram: 'approved' e o unico status que representa dinheiro recebido).
//
//   - sem pagamento aprovado            -> nao elegivel (conta gratuita)
//   - ja existe pedido para o pagamento -> nao elegivel (um pedido por pagamento)
//   - ate 7 dias do pagamento           -> elegivel, devolucao integral (CDC art. 49)
//   - plano anual, depois dos 7 dias e
//     ainda dentro do periodo pago      -> elegivel, proporcional (Termos, secao 4)
//   - plano mensal depois dos 7 dias    -> nao elegivel (Termos: sem devolucao do
//                                          mes em andamento)
async function refundEligibility(uid) {
  const { rows } = await query(
    `select id, plan, interval, amount, created_at from mp_payments
      where user_id=$1 and status='approved' order by created_at desc limit 1`,
    [uid]
  );
  const pay = rows[0] || null;
  if (!pay) return { eligible: false, code: "no_payment", pay: null };

  const paidAt = new Date(pay.created_at);
  const ageMs = Date.now() - paidAt.getTime();
  const regretEnds = new Date(paidAt.getTime() + REGRET_DAYS * DAY_MS);
  const base = { pay, paidAt, regretEnds, plan: pay.plan, interval: pay.interval };

  const prior = await query(
    "select status, created_at from refund_requests where user_id=$1 and payment_id=$2 order by created_at desc limit 1",
    [uid, String(pay.id)]
  );
  if (prior.rows[0]) {
    return { ...base, eligible: false, code: prior.rows[0].status === "aberto" ? "request_open" : "already_requested", requestedAt: prior.rows[0].created_at };
  }
  if (ageMs <= REGRET_DAYS * DAY_MS) return { ...base, eligible: true, code: "within_regret", mode: "full", withinRegret: true };
  if (pay.interval === "year" && ageMs < 365 * DAY_MS) return { ...base, eligible: true, code: "annual_prorata", mode: "prorata", withinRegret: false };
  return { ...base, eligible: false, code: "out_of_window" };
}

const REFUND_DENIED = {
  no_payment: "Não há pagamento registrado nesta conta para reembolsar.",
  request_open: "Você já tem um pedido de reembolso em análise para este pagamento. Responderemos em até 5 dias.",
  already_requested: "Já existe um pedido de reembolso registrado para este pagamento.",
  out_of_window: "O prazo de 7 dias para pedir o reembolso deste pagamento já terminou.",
};

// O que a tela precisa pra decidir se mostra o bloco de reembolso, e com que
// texto. Nao devolve id de pagamento nem valor: so o necessario.
r.get("/refund-eligibility", async (req, res, next) => {
  try {
    const e = await refundEligibility(req.user.id);
    res.json({
      eligible: e.eligible, code: e.code, mode: e.mode || null,
      paidAt: e.paidAt || null, regretEnds: e.regretEnds || null,
      interval: e.interval || null, requestedAt: e.requestedAt || null,
    });
  } catch (err) { next(err); }
});

r.post("/refund-request", async (req, res, next) => {
  try {
    const { reason, message } = refundSchema.parse(req.body);
    const uid = req.user.id;

    // Regra de negocio ANTES de qualquer efeito (gravar, mandar e-mail).
    const elig = await refundEligibility(uid);
    if (!elig.eligible) {
      const status = elig.code === "request_open" || elig.code === "already_requested" ? 409 : 403;
      return res.status(status).json({ error: REFUND_DENIED[elig.code] || "Reembolso indisponível para esta conta.", code: elig.code });
    }

    const [{ rows: urows }, { rows: crows }] = await Promise.all([
      query("select name, email, plan from users where id=$1", [uid]),
      query(`select count(*)::int as total,
                    count(*) filter (where status <> 'draft')::int as enviadas,
                    count(*) filter (where status = 'accepted')::int as aceitas
               from proposals where user_id=$1`, [uid]),
    ]);
    const u = urows[0];
    if (!u) return res.status(404).json({ error: "Conta não encontrada." });

    const pay = elig.pay;
    const paidAt = elig.paidAt;
    const withinRegret = !!elig.withinRegret;

    // O indice unico por pagamento (migracao 025) e a garantia real contra dois
    // cliques simultaneos: o segundo insert falha com 23505 e vira 409.
    try {
      await query(
        `insert into refund_requests(user_id, payment_id, reason, message, plan, amount, paid_at, within_regret)
         values($1,$2,$3,$4,$5,$6,$7,$8)`,
        [uid, String(pay.id), reason, message, pay.plan || u.plan || "", pay.amount || 0, paidAt, withinRegret]
      );
    } catch (err) {
      if (err.code === "23505") return res.status(409).json({ error: REFUND_DENIED.request_open, code: "request_open" });
      throw err;
    }

    const fmtDate = (d) => (d ? d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "");
    const c = crows[0] || {};
    const payload = {
      reason, message, fromEmail: u.email, fromName: u.name,
      planLabel: PLAN_LABELS[pay?.plan || u.plan] || (pay?.plan || u.plan || ""),
      amountStr: `R$ ${Number(pay.amount).toFixed(2).replace(".", ",")}${pay.interval === "year" ? " (anual)" : ""}`,
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

    res.status(201).json({ ok: true, withinRegret, mode: elig.mode });
  } catch (e) { next(e); }
});

export default r;
