import { env } from "../env.js";

// Monitoramento de erro (Sentry). Fica DESLIGADO enquanto SENTRY_DSN estiver
// vazio, então dev e testes não são afetados. O pacote @sentry/node só é
// importado quando há DSN, então nem precisa estar instalado em dev.
let client = null;

export async function initSentry() {
  if (!env.SENTRY_DSN) return;
  try {
    const Sentry = await import("@sentry/node");
    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,
      tracesSampleRate: 0, // só erros, sem performance monitoring (mais barato)
    });
    client = Sentry;
    console.log("[sentry] monitoramento de erro ativo");
  } catch (e) {
    console.error("[sentry] não foi possível iniciar:", e.message);
  }
}

// Envia um erro ao Sentry (no-op se não estiver configurado).
export function captureError(err, extra) {
  if (client) client.captureException(err, extra ? { extra } : undefined);
}
