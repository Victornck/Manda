// Regras de negócio dos planos — FONTE ÚNICA DA VERDADE. Para criar um plano novo
// no futuro, basta acrescentar uma entrada em PLAN_LIMITS; nada de valor solto
// espalhado pelo código. As verificações (cota e recursos) leem só daqui.

export const PLAN_RANK = { free: 0, basic: 1, pro: 2, business: 3 };

// Preço do plano em REAIS por intervalo (o cliente nunca escolhe o valor).
export const PLAN_PRICES_BRL = {
  basic: { month: 12, year: 132 },
  pro: { month: 29, year: 312 },
  business: { month: 97, year: 1044 },
};

export const PLAN_LABELS = { free: "Gratuito", basic: "Básico", pro: "Pro", business: "Business" };

// Duração de acesso liberada por um pagamento, em dias.
export const PERIOD_DAYS = { month: 30, year: 365 };

// Templates disponíveis no Básico (e no Gratuito). Pro/Business têm todos.
export const BASIC_TEMPLATES = ["minimal", "bold"];

// Recursos premium — nomes centralizados pra não espalhar strings pelo código.
export const FEATURES = { CALCULATOR: "calculator", FOLLOW_UP: "followUp" };

// Regras por plano.
//  - proposals.scope: "total" (teto vitalício da conta, ex.: trial grátis) ou
//    "month" (renova a cada mês). limit = Infinity é ilimitado.
//  - templates: null = todos; array = só esses.
//  - features: recursos premium liberados.
export const PLAN_LIMITS = {
  free:     { proposals: { scope: "total", limit: 2 },        templates: BASIC_TEMPLATES, features: [] },
  basic:    { proposals: { scope: "month", limit: 5 },        templates: BASIC_TEMPLATES, features: [FEATURES.CALCULATOR, FEATURES.FOLLOW_UP] },
  pro:      { proposals: { scope: "month", limit: 25 },       templates: null,            features: [FEATURES.CALCULATOR, FEATURES.FOLLOW_UP] },
  business: { proposals: { scope: "month", limit: Infinity }, templates: null,            features: [FEATURES.CALCULATOR, FEATURES.FOLLOW_UP] },
};

export const hasPlan = (userPlan, needed) => (PLAN_RANK[userPlan] || 0) >= (PLAN_RANK[needed] || 0);

const limitsOf = (plan) => PLAN_LIMITS[plan] || PLAN_LIMITS.free;

export const templateAllowed = (plan, template) => {
  const lim = limitsOf(plan);
  return lim.templates === null || lim.templates.includes(template);
};

// Teto de propostas do plano: { scope: "total"|"month", limit }.
export const proposalCap = (plan) => limitsOf(plan).proposals;

// Recursos premium do plano.
export const planFeatures = (plan) => limitsOf(plan).features;
export const hasFeature = (plan, feature) => planFeatures(plan).includes(feature);
