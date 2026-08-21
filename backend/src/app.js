import express from "express";
import helmet from "helmet";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./env.js";
import { generalLimiter, publicLimiter, billingLimiter, webhookLimiter } from "./middleware/rateLimit.js";
import { notFound, errorHandler } from "./middleware/error.js";
import authRoutes from "./routes/auth.js";
import proposalRoutes from "./routes/proposals.js";
import integrationRoutes from "./routes/integrations.js";
import publicRoutes from "./routes/public.js";
import billingRoutes from "./routes/billing.js";
import webhookRoutes from "./routes/webhook.js";
import feedbackRoutes from "./routes/feedback.js";
import uploadRoutes from "./routes/uploads.js";
import currencyRoutes from "./routes/currency.js";
import { uploadsDir } from "./lib/uploads.js";

// Cria e configura o app Express, SEM abrir porta nem subir jobs. Assim os
// testes (supertest) importam o app direto, e o server.js cuida do listen.
const app = express();
app.set("trust proxy", 1);
// helmet com CSP ajustado pro que o app REALMENTE usa em produção. O padrão do
// helmet é script-src 'self', que bloqueia: o login do Google (accounts.google.com),
// o script "vigia de montagem" inline do index.html, e o envio de erros pro Sentry.
// Aqui liberamos só essas origens conhecidas, mantendo o resto fechado.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "script-src": ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
      "script-src-attr": ["'unsafe-inline'"],
      "connect-src": ["'self'", "https://accounts.google.com", "https://*.ingest.us.sentry.io"],
      "frame-src": ["'self'", "https://accounts.google.com"],
      "img-src": ["'self'", "data:", "blob:", "https:"],
    },
  },
  // Login do Google abre popup/iframe; permite a comunicação com a janela do app.
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
}));
app.use(cors({ origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()) }));

app.use(express.json({ limit: "3mb" })); // headroom p/ imagens comprimidas (logo/capa) em base64

// Webhook do Mercado Pago: usa JSON e fica ANTES do rate limit geral, para que
// os reenvios da notificação não disputem cota com o resto da API. Tem teto
// próprio (webhookLimiter), bem mais largo. A confiança em QUEM chamou vem da
// checagem dentro da rota, não do IP.
app.use("/api/webhooks/mercadopago", webhookLimiter, webhookRoutes);

// Rate limit geral SÓ na API (/api). Nunca na frente do HTML, dos assets do SPA,
// das imagens em /uploads nem do /health — assim um 429 jamais apaga o site
// inteiro; no máximo segura chamadas de API. O /health fica livre de propósito
// (health check do proxy/monitor não deve gastar cota).
app.use("/api", generalLimiter);

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/proposals", proposalRoutes);
app.use("/api/integrations", integrationRoutes);
app.use("/api/public", publicLimiter, publicRoutes);
app.use("/api/billing", billingLimiter, billingRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api", currencyRoutes);

// Imagens enviadas (logo/capa), servidas do disco no MESMO domínio do app, então
// o "Baixar PDF" (html2canvas) não quebra por CORS. Nomes são únicos, cache longo.
// Porteiro: /uploads entrega SÓ imagem. Qualquer outra extensão (arquivo legado,
// erro futuro no upload) vira 404 antes de chegar no disco. O CSP fecha a porta
// de vez: mesmo que algum arquivo escape, ele não roda script nenhum.
app.use("/uploads", (req, res, next) => {
  if (!/\.(png|jpe?g|webp|gif)$/i.test(req.path)) {
    return res.status(404).json({ error: "Arquivo não encontrado." });
  }
  res.setHeader("Content-Security-Policy", "default-src 'none'; img-src 'self'; sandbox");
  next();
});
app.use("/uploads", express.static(uploadsDir, {
  maxAge: "30d", immutable: true, index: false, dotfiles: "ignore",
}));

// Serve o FRONT (build do Vite) pelo próprio backend, se o dist existir. Assim,
// em produção, um serviço só entrega o app e a API no mesmo domínio (e a URL do
// webhook vira https://mandaproposta.com/api/webhooks/mercadopago). Em dev não há
// dist, então isso fica inativo e o front continua no Vite (porta 5173).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../../frontend/dist");
if (fs.existsSync(path.join(distDir, "index.html"))) {
  app.use(express.static(distDir));
  // Lê o index.html uma vez na subida. Como é um SPA, TODAS as rotas devolvem o
  // mesmo HTML — mas a canônica precisa apontar cada URL pra si mesma, senão o
  // Google vê /precos, /privacidade etc. como "alternativas" da home (canônica
  // fixa) e não indexa. Aqui injetamos a canônica e a og:url corretas por rota.
  const indexHtml = fs.readFileSync(path.join(distDir, "index.html"), "utf8");
  // Fallback de SPA: qualquer rota que NÃO seja /api nem /health devolve o
  // index.html, para o React Router cuidar das rotas no cliente (/app, /precos,
  // /p/:token, etc.). O 404 de /api segue para o notFound.
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path === "/health") return next();
    const url = "https://mandaproposta.com" + (req.path === "/" ? "/" : req.path.replace(/\/+$/, ""));
    const html = indexHtml
      .replace('href="https://mandaproposta.com/"', `href="${url}"`)
      .replace('content="https://mandaproposta.com/"', `content="${url}"`);
    res.type("html").send(html);
  });
  console.log("[web] servindo o front a partir de", distDir);
}

app.use(notFound);
app.use(errorHandler);

export default app;
