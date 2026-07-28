import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { query } from "../db.js";
import { mpConfigured, createPreference } from "../lib/mercadopago.js";
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

export default r;
