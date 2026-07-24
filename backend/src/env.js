import "dotenv/config";

const required = (key) => {
  const v = process.env[key];
  if (!v) throw new Error(`Variável de ambiente obrigatória ausente: ${key}`);
  return v;
};

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "4000", 10),
  DATABASE_URL: required("DATABASE_URL"),
  JWT_SECRET: required("JWT_SECRET"),
  JWT_EXPIRES: process.env.JWT_EXPIRES || "7d",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",
  PGSSL: process.env.PGSSL === "true",

  // Login com Google (opcional: se vazio, a rota /auth/google responde 501).
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",

  // Email transacional (Resend). Sem a chave, os códigos vão para o console (modo dev).
  // EMAIL_FROM precisa ser de um domínio verificado no Resend (ex.: "Manda <nao-responda@seudominio.com>").
  RESEND_API_KEY: process.env.RESEND_API_KEY || "",
  EMAIL_FROM: process.env.EMAIL_FROM || "Manda <onboarding@resend.dev>",

  // Proteção do CPF em repouso (AES + índice cego HMAC). Se vazias, derivam do
  // JWT_SECRET. Em produção, gere chaves próprias:
  //   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  CPF_ENC_KEY: process.env.CPF_ENC_KEY || "",
  CPF_INDEX_KEY: process.env.CPF_INDEX_KEY || "",

  // Stripe (opcional: se vazio, as rotas de cobrança respondem 501 sem quebrar o resto).
  APP_URL: process.env.APP_URL || "http://localhost:5173",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "",
  STRIPE_PRICE_BASIC_MONTH: process.env.STRIPE_PRICE_BASIC_MONTH || "",
  STRIPE_PRICE_BASIC_YEAR: process.env.STRIPE_PRICE_BASIC_YEAR || "",
  STRIPE_PRICE_PRO_MONTH: process.env.STRIPE_PRICE_PRO_MONTH || "",
  STRIPE_PRICE_PRO_YEAR: process.env.STRIPE_PRICE_PRO_YEAR || "",
  STRIPE_PRICE_BUSINESS_MONTH: process.env.STRIPE_PRICE_BUSINESS_MONTH || "",
  STRIPE_PRICE_BUSINESS_YEAR: process.env.STRIPE_PRICE_BUSINESS_YEAR || "",
};
