import { captureWarning } from "./sentry.js";

// E-mail vai MASCARADO pro log: dá pra reconhecer o padrão do ataque sem
// despejar dado pessoal de cliente no Sentry.
export const maskEmail = (e = "") => {
  const [u, d] = String(e).split("@");
  return d ? `${u.slice(0, 2)}***@${d}` : "";
};

// Registro de evento de segurança. Sempre vai pro log do servidor (journalctl);
// quando o Sentry está ligado, também vira um evento com título fixo — e é em
// cima desse título que se configura o alerta por e-mail.
export function securityEvent(kind, req, extra = {}) {
  const info = {
    kind,
    ip: req.ip,
    path: req.originalUrl,
    ua: String(req.headers["user-agent"] || "").slice(0, 120),
    ...extra,
  };
  console.warn("[seguranca]", JSON.stringify(info));
  captureWarning(`seguranca: ${kind}`, info);
}
