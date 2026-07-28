import nodemailer from "nodemailer";
import { env } from "../env.js";

// Logo do cabeçalho dos e-mails. E-mail não renderiza SVG de forma confiável, então
// em produção (APP_URL https) usamos o PNG hospedado da marca; em dev cai no "M"
// de texto, porque uma imagem em localhost não carrega no cliente de e-mail.
const EMAIL_MARK = env.APP_URL.startsWith("https://")
  ? `<img src="${env.APP_URL}/apple-touch-icon.png" width="36" height="36" alt="M" style="display:block;border-radius:9px" />`
  : "M";

// Envio de email transacional (códigos de senha etc.) via SMTP do Gmail de
// suporte. Sem SMTP configurado, cai no modo DEV: imprime no console (fluxo
// testável sem enviar de verdade).

let transporter = null;
function getTransport() {
  if (transporter) return transporter;
  if (env.SMTP_USER && env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465, // 465 = SSL; 587 = STARTTLS
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return transporter;
}

export async function sendMail({ to, subject, html, text }) {
  const t = getTransport();
  if (t) {
    // No Gmail o "De" precisa ser a própria conta autenticada (SMTP_USER).
    await t.sendMail({ from: env.EMAIL_FROM, to, subject, html, text });
    return { smtp: true };
  }
  console.log(`\n[mailer:dev] → ${to}\n[assunto] ${subject}\n${text || html}\n`);
  return { dev: true };
}

// Template do email de código. Layout em tabelas + estilos inline (robusto em
// Gmail, Outlook, Apple Mail). O herói é o próprio código: régua terracota fina
// por cima, dígitos grandes e espaçados. Tudo o mais fica quieto e disciplinado.
export function codeEmailHtml(name, code, action = "redefinir") {
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const nm = escapeHtml(name || "");
  const cd = escapeHtml(code);
  const ac = escapeHtml(action);
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Seu código Manda</title></head>
  <body style="margin:0;padding:0;background:#EEE7DD;font-family:${font};color:#1F1B17;-webkit-font-smoothing:antialiased">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">Seu código do Manda é ${cd}. Válido por 10 minutos.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEE7DD">
      <tr><td align="center" style="padding:36px 16px 44px">
        <table role="presentation" width="440" cellpadding="0" cellspacing="0" style="width:440px;max-width:440px">

          <tr><td style="padding:0 4px 22px">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td width="36" height="36" align="center" valign="middle" style="width:36px;height:36px;background:#1F1B17;border-radius:10px;color:#fff;font-family:${font};font-size:20px;font-weight:800;line-height:36px">${EMAIL_MARK}</td>
              <td valign="middle" style="padding-left:11px;font-family:${font};font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#1F1B17">Manda</td>
            </tr></table>
          </td></tr>

          <tr><td style="background:#ffffff;border:1px solid #E6DCCF;border-radius:18px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:32px 32px 8px">
                <div style="font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#C4573B">Seu código</div>
                <p style="margin:14px 0 4px;font-size:17px;font-weight:600;color:#1F1B17">Olá, ${nm}.</p>
                <p style="margin:0;font-size:14.5px;line-height:1.55;color:#6B635A">Use o código abaixo para ${ac} sua senha.</p>
              </td></tr>

              <tr><td style="padding:20px 32px 6px">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF2EC;border:1px solid #EED9CD;border-radius:14px">
                  <tr><td align="center" style="padding:26px 12px 24px">
                    <div style="width:34px;height:3px;background:#C4573B;border-radius:2px;margin:0 auto 18px;font-size:0;line-height:0">&nbsp;</div>
                    <div style="font-family:${font};font-size:40px;font-weight:800;letter-spacing:12px;padding-left:12px;color:#1F1B17;font-variant-numeric:tabular-nums">${cd}</div>
                    <div style="margin-top:14px;font-size:12.5px;font-weight:600;color:#B08A5B;letter-spacing:0.3px">Válido por 10 minutos</div>
                  </td></tr>
                </table>
              </td></tr>

              <tr><td style="padding:14px 32px 30px">
                <div style="height:1px;background:#EFE7DB;font-size:0;line-height:0;margin-bottom:16px">&nbsp;</div>
                <p style="margin:0;font-size:12.5px;line-height:1.55;color:#9A9084">Não pediu isso? Pode ignorar este e-mail com tranquilidade. Sua senha continua a mesma e ninguém entra sem o código.</p>
              </td></tr>
            </table>
          </td></tr>

          <tr><td align="center" style="padding:24px 4px 0">
            <div style="font-size:12.5px;font-weight:700;letter-spacing:0.2px;color:#8A8175">Cria. Envia. Fecha.</div>
            <div style="margin-top:5px;font-size:11.5px;color:#A99E8E">Manda · propostas que fecham negócio</div>
          </td></tr>

        </table>
      </td></tr>
    </table>
  </body></html>`;
}

// E-mail que leva a proposta ao cliente. Enviado pelo Gmail do próprio usuário
// (via Gmail API), então o "De" é o e-mail dele de verdade. `senderName` é quem
// assina; `link` é a página pública da proposta.
export function proposalEmailHtml({ senderName, clientName, title, link, message }) {
  const safeMsg = message
    ? `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#333;white-space:pre-wrap">${escapeHtml(message)}</p>`
    : "";
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F5F1EC;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1A1A1A">
    <div style="max-width:480px;margin:0 auto;padding:40px 24px">
      <div style="background:#fff;border:1px solid #E7DFD5;border-radius:16px;padding:32px">
        <p style="margin:0 0 16px;font-size:16px">Olá, ${escapeHtml(clientName || "")}.</p>
        ${safeMsg}
        <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#333">Preparei uma proposta para você${title ? `: <strong>${escapeHtml(title)}</strong>` : ""}. É só clicar abaixo para ver os detalhes e, se fizer sentido, aceitar por ali mesmo.</p>
        <div style="text-align:center;margin:26px 0 8px">
          <a href="${escapeHtml(link)}" style="display:inline-block;background:#1A1A1A;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:12px">Ver a proposta</a>
        </div>
        <p style="margin:18px 0 0;font-size:12.5px;color:#8A8A8A;word-break:break-all">Ou copie este link: ${escapeHtml(link)}</p>
      </div>
      <p style="margin:20px 0 0;font-size:12px;color:#A79C8E;text-align:center">Enviado por ${escapeHtml(senderName || "")} · via Manda</p>
    </div>
  </body></html>`;
}

export function proposalEmailText({ senderName, clientName, title, link, message }) {
  return [
    `Olá, ${clientName || ""}.`,
    message || "",
    `Preparei uma proposta para você${title ? `: ${title}` : ""}. Veja os detalhes e aceite por aqui:`,
    link,
    "",
    `Enviado por ${senderName || ""} via Manda.`,
  ].filter(Boolean).join("\n\n");
}

// Lembrete de renovação (enviado faltando poucos dias para o acesso vencer).
export function renewalEmailHtml({ name, planLabel, dateStr, daysLeft, url }) {
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const nm = escapeHtml(name || "");
  const pl = escapeHtml(planLabel || "");
  const dt = escapeHtml(dateStr || "");
  const dd = Number(daysLeft) === 1 ? "amanhã" : `em ${escapeHtml(String(daysLeft))} dias`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Seu acesso ao Manda</title></head>
  <body style="margin:0;padding:0;background:#EEE7DD;font-family:${font};color:#1F1B17">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">Seu acesso ao Manda ${pl} vence ${dd}. Renove para continuar.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEE7DD"><tr><td align="center" style="padding:36px 16px 44px">
      <table role="presentation" width="440" cellpadding="0" cellspacing="0" style="width:440px;max-width:440px">
        <tr><td style="padding:0 4px 22px">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td width="36" height="36" align="center" valign="middle" style="width:36px;height:36px;background:#1F1B17;border-radius:10px;color:#fff;font-family:${font};font-size:20px;font-weight:800;line-height:36px">${EMAIL_MARK}</td>
            <td valign="middle" style="padding-left:11px;font-family:${font};font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#1F1B17">Manda</td>
          </tr></table>
        </td></tr>
        <tr><td style="background:#ffffff;border:1px solid #E6DCCF;border-radius:18px;padding:32px">
          <div style="font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#C4573B">Renovação</div>
          <p style="margin:14px 0 4px;font-size:17px;font-weight:600;color:#1F1B17">Olá, ${nm}.</p>
          <p style="margin:0 0 6px;font-size:14.5px;line-height:1.6;color:#6B635A">Seu acesso ao <strong style="color:#1F1B17">Manda ${pl}</strong> vence <strong style="color:#1F1B17">${dd}</strong> (${dt}). Renove para continuar criando e enviando propostas sem interrupção.</p>
          <div style="text-align:center;margin:24px 0 6px">
            <a href="${escapeHtml(url)}" style="display:inline-block;background:#1F1B17;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 30px;border-radius:12px">Renovar agora</a>
          </div>
          <p style="margin:16px 0 0;font-size:12.5px;line-height:1.55;color:#9A9084">Sem cobrança automática: você escolhe pagar por Pix, cartão ou boleto. Se não renovar, seu acesso pausa e suas propostas ficam guardadas do mesmo jeito.</p>
        </td></tr>
        <tr><td align="center" style="padding:24px 4px 0">
          <div style="font-size:12.5px;font-weight:700;color:#8A8175">Cria. Envia. Fecha.</div>
          <div style="margin-top:5px;font-size:11.5px;color:#A99E8E">Manda · propostas que fecham negócio</div>
        </td></tr>
      </table>
    </td></tr></table>
  </body></html>`;
}

export function renewalEmailText({ name, planLabel, dateStr, daysLeft, url }) {
  const dd = Number(daysLeft) === 1 ? "amanhã" : `em ${daysLeft} dias`;
  return [
    `Olá, ${name || ""}.`,
    `Seu acesso ao Manda ${planLabel} vence ${dd} (${dateStr}).`,
    `Renove para continuar sem interrupção: ${url}`,
    "Sem cobrança automática: você escolhe Pix, cartão ou boleto. Se não renovar, o acesso pausa e suas propostas ficam guardadas.",
    "",
    "Manda · propostas que fecham negócio",
  ].join("\n\n");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
