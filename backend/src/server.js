import app from "./app.js";
import { env } from "./env.js";
import { startBillingReconciler } from "./jobs/billingReconcile.js";
import { backfillCpf } from "./jobs/cpfBackfill.js";
import { initSentry, captureError } from "./lib/sentry.js";

// Liga o monitoramento de erro (no-op se não tiver SENTRY_DSN).
await initSentry();

// Erros globais não tratados: registra, manda pro Sentry e não morre calado.
process.on("unhandledRejection", (reason) => { console.error("[unhandledRejection]", reason); captureError(reason); });
process.on("uncaughtException", (err) => { console.error("[uncaughtException]", err); captureError(err); });

// Ponto de entrada em produção/dev: sobe o servidor e os jobs de fundo.
// (Os testes importam ./app.js direto, sem passar por aqui.)
app.listen(env.PORT, () => {
  console.log(`Manda API rodando em http://localhost:${env.PORT}`);
  backfillCpf().catch((e) => console.error("[pii] backfill falhou:", e.message)); // cifra CPFs legados
  startBillingReconciler(); // checagem diária de pagamento às 08:00 (Brasília)
});
