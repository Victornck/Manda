// Hierarquia dos planos. `free` = conta sem assinatura ativa (sem plano grátis
// de uso: precisa assinar para criar propostas).
export const PLAN_RANK = { free: 0, basic: 1, pro: 2, business: 3 };

// Preço do plano em REAIS por intervalo (fonte da verdade; o cliente nunca
// escolhe o valor). Espelha a tabela mostrada na página de Preços.
export const PLAN_PRICES_BRL = {
  basic: { month: 12, year: 132 },
  pro: { month: 29, year: 312 },
  business: { month: 97, year: 1044 },
};

// Rótulo amigável do plano (para descrição do pagamento no Mercado Pago).
export const PLAN_LABELS = { basic: "Básico", pro: "Pro", business: "Business" };

// Duração de acesso liberada por um pagamento, em dias.
export const PERIOD_DAYS = { month: 30, year: 365 };

// Templates disponíveis no plano Básico. Pro/Business têm todos.
export const BASIC_TEMPLATES = ["minimal", "bold"];

// Limites por plano (fonte da verdade das regras de negócio).
export const PLAN_LIMITS = {
  free: { proposalsPerMonth: 0, templates: [] },
  basic: { proposalsPerMonth: 5, templates: BASIC_TEMPLATES },
  pro: { proposalsPerMonth: 25, templates: null }, // null = todos os templates
  business: { proposalsPerMonth: Infinity, templates: null }, // ilimitado
};

export const hasPlan = (userPlan, needed) => (PLAN_RANK[userPlan] || 0) >= (PLAN_RANK[needed] || 0);

export const templateAllowed = (plan, template) => {
  const lim = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  return lim.templates === null || lim.templates.includes(template);
};
