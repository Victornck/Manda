import { test } from "node:test";
import assert from "node:assert/strict";
import { valueOf, qtyOf, lineTotal, sumItems } from "../../src/lib/items.js";
import { proposalSchema } from "../../src/lib/validate.js";

// A regra que este arquivo protege: ligar a coluna Quantidade não pode mudar o
// total de nenhuma proposta que já existe, e desligá-la tem de devolver o total
// exatamente como era. É dinheiro na tela do cliente.

const ANTIGOS = [{ desc: "Vídeo", value: "240" }, { desc: "Ensaio", value: "1200" }];

test("proposta antiga (sem qty) soma igual com a coluna ligada ou desligada", () => {
  assert.equal(sumItems(ANTIGOS, false), 1440);
  assert.equal(sumItems(ANTIGOS, true), 1440);
});

test("qty ausente, vazia, zero ou lixo valem 1", () => {
  for (const q of [undefined, "", "0", "abc", null]) {
    assert.equal(qtyOf({ qty: q }), 1, `qty=${JSON.stringify(q)}`);
  }
  assert.equal(qtyOf({ qty: "7" }), 7);
  assert.equal(qtyOf({ qty: "99999" }), 9999, "teto de 9999 para não estourar o total");
});

test("sinal é ignorado, igual ao campo de valor", () => {
  // O editor já não deixa digitar "-", mas a API aceita texto. "-3" vira 3, que
  // é exatamente o que o campo `value` faz desde a 001 — quantidade negativa
  // não existe, e é melhor ler como 3 do que gerar um total negativo.
  assert.equal(qtyOf({ qty: "-3" }), 3);
  assert.equal(valueOf({ value: "-100" }), 100);
});

test("com a coluna ligada, o valor do item é o preço unitário", () => {
  const itens = [{ value: "240", qty: "3" }, { value: "1200", qty: "1" }, { value: "180", qty: "6" }];
  assert.equal(sumItems(itens, true), 720 + 1200 + 1080);
  assert.equal(lineTotal({ value: "240", qty: "3" }, true), 720);
});

test("desligar a coluna ignora a quantidade sem apagá-la", () => {
  const itens = [{ value: "240", qty: "3" }, { value: "180", qty: "6" }];
  assert.equal(sumItems(itens, false), 420, "volta a somar só os valores");
  assert.equal(lineTotal(itens[0], false), 240);
});

test("item oculto não entra no total, com ou sem quantidade", () => {
  const itens = [{ value: "100", qty: "2" }, { value: "999", qty: "5", hidden: true }];
  assert.equal(sumItems(itens, true), 200);
  assert.equal(sumItems(itens, false), 100);
});

test("valor com máscara ou lixo vira número", () => {
  assert.equal(valueOf({ value: "R$ 1.200" }), 1200);
  assert.equal(valueOf({ value: "" }), 0);
  assert.equal(valueOf({}), 0);
});

test("sumItems aguenta entrada torta sem explodir", () => {
  assert.equal(sumItems(null, true), 0);
  assert.equal(sumItems(undefined, false), 0);
  assert.equal(sumItems([null, undefined, {}], true), 0);
});

test("schema aceita proposta sem os campos novos (compatibilidade)", () => {
  const p = proposalSchema.parse({ items: [{ desc: "Vídeo", value: "240" }] });
  assert.equal(p.showQty, false, "proposta antiga nasce com a coluna desligada");
  assert.equal(p.items[0].qty, "", "item antigo nasce sem quantidade");
});

test("schema aceita e preserva quantidade", () => {
  const p = proposalSchema.parse({ showQty: true, items: [{ desc: "Vídeo", value: "240", qty: "3" }] });
  assert.equal(p.showQty, true);
  assert.equal(p.items[0].qty, "3");
  assert.equal(sumItems(p.items, p.showQty), 720);
});

test("schema recusa quantidade absurdamente longa", () => {
  assert.throws(() => proposalSchema.parse({ items: [{ desc: "X", value: "1", qty: "123456" }] }));
});
