import rateLimit from "express-rate-limit";

export const generalLimiter = rateLimit({
  windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false,
});

// Cadastro/login: mais restrito, para dificultar força bruta.
export const authLimiter = rateLimit({
  windowMs: 15 * 60_000, max: 20, standardHeaders: true, legacyHeaders: false,
  message: { error: "Muitas tentativas. Tente novamente mais tarde." },
});
