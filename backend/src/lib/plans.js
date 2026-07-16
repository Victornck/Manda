import { env } from "../env.js";

// Hierarquia dos planos. `free` = conta sem assinatura ativa (sem plano grátis
// de uso: precisa assinar para criar propostas).
export const PLAN_RANK = { free: 0, basic: 1, pro: 2, business: 3 };

// Plano + intervalo -> price id do Stripe. O VALOR é definido aqui no servidor;
// o cliente nunca escolhe quanto paga.
export const PLAN_PRICES = {
  basic: { month: env.STRIPE_PRICE_BASIC_MONTH, year: env.STRIPE_PRICE_BASIC_YEAR },
  pro: { month: env.STRIPE_PRICE_PRO_MONTH, year: env.STRIPE_PRICE_PRO_YEAR },
  business: { month: env.STRIPE_PRICE_BUSINESS_MONTH, year: env.STRIPE_PRICE_BUSINESS_YEAR },
};

// Price id -> plano (para o webhook reagir a mudanças de assinatura).
export const PRICE_TO_PLAN = Object.fromEntries(
  Object.entries(PLAN_PRICES).flatMap(([plan, ivs]) =>
    Object.values(ivs).filter(Boolean).map((priceId) => [priceId, plan])
  )
);

// Templates disponíveis no plano Básico. Pro/Business têm todos.
export const BASIC_TEMPLATES = ["minimal", "bold"];

// Limites por plano (fonte da verdade das regras de negócio).
export const PLAN_LIMITS = {
  free: { proposalsPerMonth: 0, templates: [] },
  basic: { proposalsPerMonth: 2, templates: BASIC_TEMPLATES },
  pro: { proposalsPerMonth: Infinity, templates: null }, // null = todos
  business: { proposalsPerMonth: Infinity, templates: null },
};

export const hasPlan = (userPlan, needed) => (PLAN_RANK[userPlan] || 0) >= (PLAN_RANK[needed] || 0);

export const templateAllowed = (plan, template) => {
  const lim = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  return lim.templates === null || lim.templates.includes(template);
};
