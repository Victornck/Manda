import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { query } from "../db.js";
import { mpConfigured, createPreference, createPreapproval, cancelPreapproval } from "../lib/mercadopago.js";
import { PLAN_PRICES_BRL, PLAN_LABELS } from "../lib/plans.js";
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

export default r;
