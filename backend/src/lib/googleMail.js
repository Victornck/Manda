import { env } from "../env.js";

// Integração com o Gmail API para ENVIAR e-mails como o próprio usuário.
// Usa só o escopo gmail.send (o mínimo: envia, não lê a caixa). Esse escopo NÃO
// exige a auditoria de segurança CASA que os escopos de leitura exigem.
//
// Fluxo OAuth (authorization code + offline):
//   1. buildAuthUrl(state)  -> manda o usuário ao Google consentir.
//   2. exchangeCode(code)   -> troca o code por access_token + refresh_token.
//   3. refreshAccessToken() -> renova o access_token quando expira.
//   4. sendGmail()          -> POST da mensagem MIME (base64url) no Gmail API.

export const GMAIL_SCOPES = "openid email https://www.googleapis.com/auth/gmail.send";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";

export function googleConfigured() {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

// URL da tela de consentimento. `state` deve ser um token assinado (anti-CSRF e
// para amarrar o callback ao usuário logado). prompt=consent + access_type=offline
// garantem que o Google devolva o refresh_token.
export function buildAuthUrl(state) {
  const p = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_OAUTH_REDIRECT,
    response_type: "code",
    scope: GMAIL_SCOPES,
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state,
  });
  return `${AUTH_URL}?${p.toString()}`;
}

// Troca o authorization code pelos tokens.
export async function exchangeCode(code) {
  const body = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: env.GOOGLE_OAUTH_REDIRECT,
    grant_type: "authorization_code",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`token exchange (${res.status}): ${data.error || ""} ${data.error_description || ""}`.trim());
  return data; // { access_token, refresh_token, expires_in, scope, token_type, id_token }
}

// Renova o access_token a partir do refresh_token.
export async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    grant_type: "refresh_token",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`token refresh (${res.status}): ${data.error || ""}`.trim());
    // invalid_grant = refresh_token revogado/expirado -> precisa reconectar.
    err.revoked = data.error === "invalid_grant";
    throw err;
  }
  return data; // { access_token, expires_in, scope, token_type }
}

// E-mail da conta conectada (para exibir "conectado como ...").
export async function getUserEmail(accessToken) {
  const res = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`userinfo (${res.status})`);
  return String(data.email || "").toLowerCase();
}

// Envia a mensagem já montada (raw MIME em base64url).
export async function sendGmail(accessToken, rawBase64Url) {
  const res = await fetch(SEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: rawBase64Url }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`gmail send (${res.status}): ${data?.error?.message || ""}`.trim());
    err.status = res.status;
    throw err;
  }
  return data; // { id, threadId, labelIds }
}

// Revoga o acesso no Google (ao desconectar). Best-effort.
export async function revokeToken(token) {
  try {
    await fetch(`${REVOKE_URL}?token=${encodeURIComponent(token)}`, { method: "POST" });
  } catch { /* ignore */ }
}

// ── Montagem MIME ───────────────────────────────────────────────────────────

const b64 = (str) => Buffer.from(str, "utf8").toString("base64");
const base64url = (str) => Buffer.from(str, "utf8").toString("base64url");
// Quebra o base64 em linhas de 76 chars (exigência de alguns servidores).
const wrap76 = (s) => s.replace(/.{1,76}/g, "$&\r\n").trimEnd();

// Codifica cabeçalho com acento (RFC 2047). ASCII puro passa direto.
function encodeHeader(s) {
  const str = String(s || "");
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(str)) return str;
  return `=?UTF-8?B?${b64(str)}?=`;
}

// Monta um e-mail multipart/alternative (texto + HTML) e devolve em base64url,
// pronto para o campo `raw` do Gmail API.
export function buildRawEmail({ fromName, fromEmail, to, subject, html, text }) {
  const boundary = "mnd_" + Math.random().toString(36).slice(2);
  const fromDisplay = fromName ? `${encodeHeader(fromName)} <${fromEmail}>` : fromEmail;
  const headers = [
    `From: ${fromDisplay}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].join("\r\n");

  const body = [
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(b64(text || "")),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(b64(html || "")),
    `--${boundary}--`,
    "",
  ].join("\r\n");

  return base64url(headers + "\r\n" + body);
}
