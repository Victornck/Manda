import express from "express";
import helmet from "helmet";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./env.js";
import { generalLimiter, publicLimiter, billingLimiter } from "./middleware/rateLimit.js";
import { notFound, errorHandler } from "./middleware/error.js";
import authRoutes from "./routes/auth.js";
import proposalRoutes from "./routes/proposals.js";
import integrationRoutes from "./routes/integrations.js";
import publicRoutes from "./routes/public.js";
import billingRoutes from "./routes/billing.js";
import webhookRoutes from "./routes/webhook.js";
import feedbackRoutes from "./routes/feedback.js";

// Cria e configura o app Express, SEM abrir porta nem subir jobs. Assim os
// testes (supertest) importam o app direto, e o server.js cuida do listen.
const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()) }));

app.use(express.json({ limit: "3mb" })); // headroom p/ imagens comprimidas (logo/capa) em base64

// Webhook do Mercado Pago: usa JSON e fica ANTES do rate limit geral, para que
// os reenvios da notificação nunca sejam barrados. A confiança vem da assinatura
// validada dentro da rota, não do IP.
app.use("/api/webhooks/mercadopago", webhookRoutes);

app.use(generalLimiter);

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/proposals", proposalRoutes);
app.use("/api/integrations", integrationRoutes);
app.use("/api/public", publicLimiter, publicRoutes);
app.use("/api/billing", billingLimiter, billingRoutes);
app.use("/api/feedback", feedbackRoutes);

// Serve o FRONT (build do Vite) pelo próprio backend, se o dist existir. Assim,
// em produção, um serviço só entrega o app e a API no mesmo domínio (e a URL do
// webhook vira https://mandaproposta.com/api/webhooks/mercadopago). Em dev não há
// dist, então isso fica inativo e o front continua no Vite (porta 5173).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../../frontend/dist");
if (fs.existsSync(path.join(distDir, "index.html"))) {
  app.use(express.static(distDir));
  // Fallback de SPA: qualquer rota que NÃO seja /api nem /health devolve o
  // index.html, para o React Router cuidar das rotas no cliente (/app, /precos,
  // /p/:token, etc.). O 404 de /api segue para o notFound.
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path === "/health") return next();
    res.sendFile(path.join(distDir, "index.html"));
  });
  console.log("[web] servindo o front a partir de", distDir);
}

app.use(notFound);
app.use(errorHandler);

export default app;
