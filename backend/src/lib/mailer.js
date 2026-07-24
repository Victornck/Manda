import { env } from "../env.js";

// Envio de email transacional via Resend (REST — sem SDK).
// Sem RESEND_API_KEY, cai no modo DEV: registra o conteúdo no console. Isso deixa
// o fluxo de código testável enquanto o domínio de envio ainda não foi verificado.
export async function sendMail({ to, subject, html, text }) {
  if (!env.RESEND_API_KEY) {
    console.log(`\n[mailer:dev] → ${to}\n[assunto] ${subject}\n${text || html}\n`);
    return { dev: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, html, text }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Falha ao enviar email (${res.status}): ${detail.slice(0, 200)}`);
  }
  return res.json().catch(() => ({}));
}

// Template simples e com a identidade do produto para os emails de código.
export function codeEmailHtml(name, code, action = "redefinir") {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F5F1EC;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1A1A1A">
    <div style="max-width:440px;margin:0 auto;padding:40px 24px">
      <div style="font-weight:800;font-size:20px;letter-spacing:-0.02em;color:#8A3B2A;margin-bottom:24px">Manda</div>
      <div style="background:#fff;border:1px solid #E7DFD5;border-radius:16px;padding:28px">
        <p style="margin:0 0 6px;font-size:15px">Olá, ${escapeHtml(name || "")}.</p>
        <p style="margin:0 0 18px;font-size:14px;color:#555">Use o código abaixo para ${escapeHtml(action)} sua senha. Ele expira em 10 minutos.</p>
        <div style="font-size:34px;font-weight:800;letter-spacing:8px;text-align:center;background:#F7F3EE;border:1px solid #E7DFD5;border-radius:12px;padding:16px 0;color:#1A1A1A">${escapeHtml(code)}</div>
        <p style="margin:18px 0 0;font-size:12.5px;color:#8A8A8A">Se você não fez esse pedido, ignore este email — sua senha continua a mesma.</p>
      </div>
      <p style="margin:20px 0 0;font-size:12px;color:#A79C8E;text-align:center">Manda · propostas que fecham negócio</p>
    </div>
  </body></html>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
