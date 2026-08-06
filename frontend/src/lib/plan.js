// Permissões de plano no frontend. NÃO hardcoda regra nenhuma: lê sempre do que
// o backend enviou em user.features / user.proposalLimit (fonte única da verdade
// em backend/src/lib/plans.js). Assim, criar um plano novo lá reflete aqui.

export const FEATURES = { CALCULATOR: "calculator", FOLLOW_UP: "followUp" };

export const isAdmin = (user) => user?.role === "admin";

// Conta no plano Gratuito (sem assinatura). Admin nunca é "free".
export const isFreePlan = (user) => !!user && !isAdmin(user) && (user.plan === "free" || !user.plan);

// Tem acesso a um recurso premium? Admin tem tudo.
export const hasFeature = (user, feature) => {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return Array.isArray(user.features) && user.features.includes(feature);
};
