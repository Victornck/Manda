import express from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./env.js";
import { generalLimiter } from "./middleware/rateLimit.js";
import { notFound, errorHandler } from "./middleware/error.js";
import authRoutes from "./routes/auth.js";
import proposalRoutes from "./routes/proposals.js";
import publicRoutes from "./routes/public.js";
import billingRoutes from "./routes/billing.js";
import webhookRoutes from "./routes/webhook.js";

const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()) }));

// Webhook do Stripe ANTES do express.json(): a verificação de assinatura
// precisa do corpo BRUTO (raw), não do JSON já parseado.
app.use("/api/webhooks/stripe", express.raw({ type: "application/json" }), webhookRoutes);

app.use(express.json({ limit: "1mb" }));
app.use(generalLimiter);

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/proposals", proposalRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/billing", billingRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(env.PORT, () => console.log(`Manda API rodando em http://localhost:${env.PORT}`));
