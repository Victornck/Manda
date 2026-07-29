import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { verifyWebhook } from "../../src/lib/mercadopago.js";

// Recria a assinatura como o Mercado Pago faria, com o MP_WEBHOOK_SECRET do .env.test.
const SECRET = process.env.MP_WEBHOOK_SECRET; // "test-webhook-secret"

function signedReq(dataId, { tamper = false } = {}) {
  const ts = "1700000000";
  const reqId = "req-123";
  const manifest = `id:${dataId};request-id:${reqId};ts:${ts};`;
  let v1 = crypto.createHmac("sha256", SECRET).update(manifest).digest("hex");
  if (tamper) v1 = "dead" + v1.slice(4);
  return {
    headers: { "x-signature": `ts=${ts},v1=${v1}`, "x-request-id": reqId },
    query: { "data.id": dataId, type: "payment" },
    body: {},
  };
}

test("assinatura válida é aceita e devolve o paymentId", () => {
  const r = verifyWebhook(signedReq("123456"));
  assert.equal(r.ok, true);
  assert.equal(r.paymentId, "123456");
});

test("assinatura adulterada é rejeitada", () => {
  const r = verifyWebhook(signedReq("123456", { tamper: true }));
  assert.equal(r.ok, false);
});

test("sem cabeçalho de assinatura, rejeita", () => {
  const r = verifyWebhook({ headers: {}, query: { "data.id": "1" }, body: {} });
  assert.equal(r.ok, false);
});
