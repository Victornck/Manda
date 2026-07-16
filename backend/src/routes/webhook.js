import { Router } from "express";
import { stripe } from "../lib/stripe.js";
import { env } from "../env.js";
import { query } from "../db.js";
import { PRICE_TO_PLAN } from "../lib/plans.js";

const r = Router();

// IMPORTANTE: montado com express.raw() no server.js — a verificação de
// assinatura precisa do corpo BRUTO, não do JSON já parseado.
r.post("/", async (req, res) => {
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) return res.status(501).end();

  let event;
  try {
    // Só confia no evento se a assinatura bater com o segredo do Stripe.
    // O usuário não tem esse segredo, então não consegue forjar um "paguei".
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook inválido: ${err.message}`);
  }

  // Idempotência: processa cada evento uma única vez.
  try {
    const dup = await query("insert into billing_events(id) values($1) on conflict do nothing returning id", [event.id]);
    if (!dup.rows.length) return res.json({ received: true, duplicate: true });
  } catch { /* se falhar, segue e processa mesmo assim */ }

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object;
      const userId = s.metadata?.userId || s.client_reference_id;
      const plan = s.metadata?.plan;
      if (userId && plan) {
        await query(
          "update users set plan=$2, stripe_customer_id=coalesce(stripe_customer_id,$3), stripe_subscription_id=$4, subscription_status='active' where id=$1",
          [userId, plan, s.customer, s.subscription]
        );
      }
    } else if (event.type === "customer.subscription.updated") {
      const sub = event.data.object;
      const userId = sub.metadata?.userId;
      const priceId = sub.items?.data?.[0]?.price?.id;
      const active = ["active", "trialing"].includes(sub.status);
      const plan = active ? (PRICE_TO_PLAN[priceId] || "free") : "free";
      if (userId) {
        await query(
          "update users set plan=$2, subscription_status=$3, current_period_end=to_timestamp($4) where id=$1",
          [userId, plan, sub.status, sub.current_period_end]
        );
      }
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      const userId = sub.metadata?.userId;
      if (userId) await query("update users set plan='free', subscription_status='canceled' where id=$1", [userId]);
    }
  } catch (e) {
    console.error("Erro no handler do webhook:", e.message);
    return res.status(500).json({ error: "Falha ao processar." });
  }

  res.json({ received: true });
});

export default r;
