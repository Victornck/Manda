import { captureError } from "../lib/sentry.js";

export function notFound(req, res) {
  res.status(404).json({ error: "Rota não encontrada." });
}

export function errorHandler(err, req, res, _next) {
  if (err?.type === "entity.parse.failed" || err instanceof SyntaxError) {
    return res.status(400).json({ error: "JSON inválido no corpo da requisição." });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "Arquivo ou dados grandes demais." });
  }
  if (err?.name === "ZodError") {
    return res.status(400).json({ error: "Dados inválidos.", details: err.issues });
  }
  const status = err?.status || 500;
  // 5xx: registra o stack pra debug, manda pro Sentry, mas nunca vaza detalhes ao cliente.
  if (status >= 500) {
    console.error("[erro]", req.method, req.originalUrl, "-", err?.stack || err?.message || err);
    captureError(err, { method: req.method, url: req.originalUrl });
  }
  res.status(status).json({ error: status >= 500 ? "Erro interno do servidor." : (err?.public || "Requisição inválida.") });
}
