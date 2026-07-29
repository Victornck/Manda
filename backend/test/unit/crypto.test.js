import { test } from "node:test";
import assert from "node:assert/strict";
import { encryptCpf, decryptCpf, cpfIndex } from "../../src/lib/pii.js";
import { seal, open } from "../../src/lib/secretbox.js";

test("CPF cifra e decifra de volta (roundtrip)", () => {
  const cpf = "11144477735";
  const enc = encryptCpf(cpf);
  assert.notEqual(enc, cpf, "não deve ser texto plano");
  assert.equal(decryptCpf(enc), cpf);
});

test("mesmo CPF gera cifras diferentes (IV aleatório), mas índice igual", () => {
  const a = encryptCpf("11144477735");
  const b = encryptCpf("11144477735");
  assert.notEqual(a, b, "cifras devem diferir (IV aleatório)");
  assert.equal(cpfIndex("11144477735"), cpfIndex("11144477735"), "índice é determinístico");
  assert.notEqual(cpfIndex("11144477735"), cpfIndex("11144477736"), "CPFs diferentes, índices diferentes");
});

test("cifra adulterada não decifra (retorna null)", () => {
  const enc = encryptCpf("11144477735");
  const tampered = "AA" + enc.slice(2);
  assert.equal(decryptCpf(tampered), null);
});

test("secretbox: seal/open roundtrip e rejeita adulteração", () => {
  const secret = "1//refresh-token-super-secreto";
  const sealed = seal(secret);
  assert.notEqual(sealed, secret);
  assert.equal(open(sealed), secret);
  assert.equal(open("zz" + sealed.slice(2)), null, "adulterado deve dar null");
});
