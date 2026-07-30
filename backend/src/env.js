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
  // Envio de proposta pelo Gmail do usuário (Gmail API). Precisa do CLIENT_SECRET
  // e do redirect autorizado no Google Cloud Console. Sem eles, as rotas de
  // integração respondem 501 e o resto do app segue normal.
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
  GOOGLE_OAUTH_REDIRECT: process.env.GOOGLE_OAUTH_REDIRECT || "http://localhost:4000/api/integrations/google/callback",
  // Chave para cifrar os refresh_tokens do Gmail em repouso. Se vazia, deriva do
  // JWT_SECRET (funciona, mas em produção defina uma própria).
  GOOGLE_TOKEN_KEY: process.env.GOOGLE_TOKEN_KEY || "",

  // Email transacional (códigos de senha) via SMTP do Gmail. Sem SMTP_USER/PASS,
  // cai no modo dev (imprime no console). O "De" (EMAIL_FROM) deve ser a própria
  // conta autenticada (SMTP_USER), ex.: mandaaisuporte@gmail.com.
  SMTP_HOST: process.env.SMTP_HOST || "smtp.gmail.com",
  SMTP_PORT: parseInt(process.env.SMTP_PORT || "465", 10),
  SMTP_USER: process.env.SMTP_USER || "",
  // Senha de App do Google: vem em 4 blocos com espaços; removemos os espaços.
  SMTP_PASS: (process.env.SMTP_PASS || "").replace(/\s+/g, ""),
  EMAIL_FROM: process.env.EMAIL_FROM || "Manda <mandaaisuporte@gmail.com>",

  // Proteção do CPF em repouso (AES + índice cego HMAC). Se vazias, derivam do
  // JWT_SECRET. Em produção, gere chaves próprias:
  //   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  CPF_ENC_KEY: process.env.CPF_ENC_KEY || "",
  CPF_INDEX_KEY: process.env.CPF_INDEX_KEY || "",

  // Mercado Pago (pagamentos: Pix, cartão, boleto). Sem o access token, as rotas
  // de cobrança respondem 501 e o resto do app segue normal.
  //   MP_ACCESS_TOKEN: "Access Token" das credenciais (TEST-... ou APP_USR-...).
  //   MP_WEBHOOK_SECRET: a "Chave secreta" da notificação (Webhooks) p/ validar a assinatura.
  MP_ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN || "",
  MP_WEBHOOK_SECRET: process.env.MP_WEBHOOK_SECRET || "",
  // URL pública do BACKEND (onde o Mercado Pago manda a notificação). Em dev com
  // localhost, use um túnel (ngrok/cloudflared) porque o MP precisa alcançar a URL.
  BACKEND_URL: process.env.BACKEND_URL || "http://localhost:4000",

  // URL pública do FRONT (usada nos redirects do checkout). Em produção, o domínio real.
  APP_URL: process.env.APP_URL || "http://localhost:5173",

  // Monitoramento de erro (Sentry). Se vazio, fica DESLIGADO (dev e testes não
  // são afetados). Em produção, cole o DSN do projeto backend para ligar.
  SENTRY_DSN: process.env.SENTRY_DSN || "",

  // Pasta no disco onde ficam as imagens enviadas (logo/capa das propostas).
  // Vazio = padrão (<raiz do projeto>/uploads), que sobrevive a git pull/rebuild.
  UPLOADS_DIR: process.env.UPLOADS_DIR || "",
};
