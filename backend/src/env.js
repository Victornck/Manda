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
