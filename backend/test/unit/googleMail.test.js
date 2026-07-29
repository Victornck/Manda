import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRawEmail } from "../../src/lib/googleMail.js";

test("buildRawEmail monta MIME válido em base64url", () => {
  const raw = buildRawEmail({
    fromName: "Gabriel Berlinck", fromEmail: "eu@gmail.com", to: "cliente@teste.com",
    subject: "Proposta: Produção de vídeo", html: "<b>Olá</b> ção", text: "Olá ção",
  });
  const decoded = Buffer.from(raw, "base64url").toString("utf8");

  assert.match(decoded, /From: Gabriel Berlinck <eu@gmail.com>/);
  assert.match(decoded, /To: cliente@teste\.com/);
  assert.match(decoded, /Subject: =\?UTF-8\?B\?/, "assunto com acento vai codificado (RFC 2047)");
  assert.match(decoded, /multipart\/alternative; boundary=/);
  assert.match(decoded, /text\/plain/);
  assert.match(decoded, /text\/html/);
});

test("assunto só-ASCII passa direto, sem codificação", () => {
  const raw = buildRawEmail({ fromEmail: "a@b.com", to: "c@d.com", subject: "Hello", html: "x", text: "x" });
  const decoded = Buffer.from(raw, "base64url").toString("utf8");
  assert.match(decoded, /Subject: Hello/);
});
