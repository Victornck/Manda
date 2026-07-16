import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { query } from "../db.js";
import { stripe } from "../lib/stripe.js";
import { PLAN_PRICES } from "../lib/plans.js";
import { env } from "../env.js";

const r = Router();
r.use(requireAuth);

const schema = z.object({
  plan: z.enum(["basic", "pro", "business"]),
  interval: z.enum(["month", "year"]).optional().default("month"),
});

// Cria a sessão de checkout. O preço vem do servidor (PLAN_PRICES), não do cliente.
r.post("/checkout", async (req, res, next) => {
  try {
    if (!stripe) return res.status(501).json({ error: "Pagamentos não configurados." });
    const { plan, interval } = schema.parse(req.body);
    const price = PLAN_PRICES[plan]?.[interval];
    if (!price) return res.status(400).json({ error: "Plano ou intervalo indisponível." });

    const { rows } = await query("select id, email, stripe_customer_id from users where id=$1", [req.user.id]);
    const u = rows[0];

    let session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price, quantity: 1 }],
        customer: u.stripe_customer_id || undefined,
        customer_email: u.stripe_customer_id ? undefined : u.email,
        client_reference_id: u.id,
        metadata: { userId: u.id, plan },
        subscription_data: { metadata: { userId: u.id, plan } },
        success_url: `${env.APP_URL}/app?assinatura=ok`,
        cancel_url: `${env.APP_URL}/precos?assinatura=cancelada`,
      });
    } catch (e) {
      // Erro do Stripe (price inexistente, chave errada, modo teste x produção).
      // Devolve a mensagem real pra facilitar o diagnóstico — não é dado sensível.
      console.error("[stripe checkout]", e?.message);
      return res.status(400).json({ error: `Stripe: ${e?.message || "falha ao criar o checkout."}` });
    }
    res.json({ url: session.url });
  } catch (e) { next(e); }
});

// Portal do Stripe para o usuário gerenciar/cancelar a própria assinatura.
r.post("/portal", async (req, res, next) => {
  try {
    if (!stripe) return res.status(501).json({ error: "Pagamentos não configurados." });
    const { rows } = await query("select stripe_customer_id from users where id=$1", [req.user.id]);
    const cid = rows[0]?.stripe_customer_id;
    if (!cid) return res.status(400).json({ error: "Sem assinatura ativa." });
    const session = await stripe.billingPortal.sessions.create({ customer: cid, return_url: `${env.APP_URL}/app` });
    res.json({ url: session.url });
  } catch (e) { next(e); }
});

export default r;
