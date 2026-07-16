export function notFound(req, res) {
  res.status(404).json({ error: "Rota não encontrada." });
}

export function errorHandler(err, req, res, _next) {
  if (err?.type === "entity.too.large") return res.status(413).json({ error: "Payload muito grande." });
  if (err?.name === "ZodError") return res.status(400).json({ error: "Dados inválidos.", details: err.issues });
  // Não vaza detalhes internos ao cliente.
  console.error(err);
  res.status(err.status || 500).json({ error: err.public || "Erro interno." });
}
