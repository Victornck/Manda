import crypto from "node:crypto";
import { env } from "../env.js";

// Integração com o Mercado Pago (Checkout Pro) via REST, sem SDK.
// O usuário escolhe a forma de pagar (Pix, cartão ou boleto) na tela do MP.
// Cada pagamento aprovado libera um período de acesso (ver webhook).

const API = "https://api.mercadopago.com";

export function mpConfigured() {
  return Boolean(env.MP_ACCESS_TOKEN);
}

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`, "Content-Type": "application/json", ...extra };
}

// Cria uma preferência de checkout e devolve o link para o qual redirecionar.
// `externalReference` amarra o pagamento ao usuário/plano (o MP propaga esse
// campo para o pagamento, então dá para saber quem pagou o quê no webhook).
export async function createPreference({ title, amount, externalReference, metadata, successUrl, failureUrl, pendingUrl, notificationUrl, payerEmail }) {
  // auto_return exige URL de sucesso em HTTPS (o MP recusa http://localhost).
  // Em dev (localhost), enviamos sem auto_return: o usuário volta pelo botão
  // "voltar ao site". Em produção (https), o redirecionamento é automático.
  const secure = String(successUrl || "").startsWith("https://");
  const body = {
    items: [{ title, quantity: 1, unit_price: Number(amount), currency_id: "BRL" }],
    external_reference: externalReference,
    metadata,
    back_urls: { success: successUrl, failure: failureUrl, pending: pendingUrl },
    ...(secure ? { auto_return: "approved" } : {}),
    // Sem notification_url de propósito: as notificações vêm pelo Webhook do
    // PAINEL (assinado com a MP_WEBHOOK_SECRET). A notification_url da preferência
    // é assinada com outra chave e não valida.
    ...(notificationUrl ? { notification_url: notificationUrl } : {}),
    statement_descriptor: "MANDA",
    ...(payerEmail ? { payer: { email: payerEmail } } : {}),
  };
  const res = await fetch(`${API}/checkout/preferences`, {
    method: "POST",
    headers: authHeaders({ "X-Idempotency-Key": crypto.randomUUID() }),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`preference (${res.status}): ${data.message || data.error || ""}`.trim());
  return data; // { id, init_point, sandbox_init_point, ... }
}

// Busca um pagamento pelo id (usado no webhook para confirmar o status real).
export async function getPayment(id) {
  const res = await fetch(`${API}/v1/payments/${id}`, { headers: authHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(`payment ${id} (${res.status})`);
    e.status = res.status;
    throw e;
  }
  return data; // { id, status, transaction_amount, external_reference, metadata, ... }
}

// Valida a assinatura da notificação (x-signature + x-request-id + data.id).
// Sem MP_WEBHOOK_SECRET, não dá para confiar: retorna { ok:false }.
// Doc: manifesto "id:<dataId>;request-id:<reqId>;ts:<ts>;" com HMAC-SHA256.
export function verifyWebhook(req) {
  if (!env.MP_WEBHOOK_SECRET) return { ok: false, reason: "sem segredo" };
  const sig = String(req.headers["x-signature"] || "");
  const reqId = String(req.headers["x-request-id"] || "");
  const dataId = String(req.query["data.id"] || req.query.id || req.body?.data?.id || "").toLowerCase();

  const parts = Object.fromEntries(sig.split(",").map((kv) => {
    const [k, v] = kv.split("=");
    return [String(k || "").trim(), String(v || "").trim()];
  }));
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1 || !dataId) return { ok: false, reason: "assinatura incompleta" };

  const manifest = `id:${dataId};request-id:${reqId};ts:${ts};`;
  const expected = crypto.createHmac("sha256", env.MP_WEBHOOK_SECRET).update(manifest).digest("hex");
  let ok = false;
  try { ok = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1)); } catch { ok = false; }
  return { ok, paymentId: dataId };
}
