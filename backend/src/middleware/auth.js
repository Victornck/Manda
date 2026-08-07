import { verifyToken } from "../lib/jwt.js";
import { securityEvent } from "../lib/securityLog.js";

export function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Não autenticado." });
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub };
    next();
  } catch (e) {
    // Sessão expirada é rotina (o JWT dura 7 dias) e não é sinal de ataque.
    // Token malformado ou com assinatura errada, sim: alguém está mexendo.
    if (e?.name !== "TokenExpiredError") securityEvent("token_invalido", req, { motivo: e?.name });
    return res.status(401).json({ error: "Sessão inválida ou expirada." });
  }
}
