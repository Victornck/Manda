import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidCPF, cpfDigits } from "../../src/lib/cpf.js";
import { makeCpf } from "../data.js";

test("cpfDigits tira máscara e não-dígitos", () => {
  assert.equal(cpfDigits("111.444.777-35"), "11144477735");
  assert.equal(cpfDigits("abc123"), "123");
});

test("isValidCPF aceita CPF válido", () => {
  assert.equal(isValidCPF("111.444.777-35"), true);
  assert.equal(isValidCPF(makeCpf(123456789)), true);
});

test("isValidCPF rejeita dígito verificador errado", () => {
  assert.equal(isValidCPF("111.444.777-34"), false);
});

test("isValidCPF rejeita todos iguais e tamanho errado", () => {
  assert.equal(isValidCPF("111.111.111-11"), false);
  assert.equal(isValidCPF("123"), false);
});
