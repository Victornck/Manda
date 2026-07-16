import Stripe from "stripe";
import { env } from "../env.js";

// Se a chave não estiver configurada, `stripe` fica null e as rotas de
// cobrança respondem 501 — o resto da API continua funcionando normalmente.
export const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;
