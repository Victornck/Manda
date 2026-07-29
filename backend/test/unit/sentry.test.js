import { test } from "node:test";
import assert from "node:assert/strict";
import { initSentry, captureError } from "../../src/lib/sentry.js";

// Em teste não há SENTRY_DSN, então o monitoramento fica DESLIGADO. O que
// garantimos aqui: nada disso quebra nem exige o pacote @sentry/node instalado.

test("initSentry não faz nada (e não lança) quando SENTRY_DSN está vazio", async () => {
  await assert.doesNotReject(() => initSentry());
});

test("captureError é no-op silencioso quando desligado", () => {
  assert.doesNotThrow(() => captureError(new Error("teste")));
  assert.equal(captureError(new Error("teste")), undefined);
});
