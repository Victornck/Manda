import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Guarda contra a classe de erro que derrubou a criação de proposta na 0.10.0:
// a coluna nova entrou na lista de colunas e o valor entrou no array, mas
// ninguém acrescentou o placeholder correspondente. O Postgres recusa a query
// inteira ("INSERT has more target columns than expressions") e a API devolve
// 500 — sem nenhum sinal em tempo de build, porque JavaScript não conta nada
// disso. Aqui a contagem é conferida no teste.

const dir = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(dir, "../../src/routes/proposals.js"), "utf8");

// Conta itens de topo de uma lista, ignorando vírgulas dentro de (), [] e {}.
const contaTopo = (txt) => {
  let d = 0, n = 1;
  for (const ch of txt) {
    if ("([{".includes(ch)) d++;
    else if (")]}".includes(ch)) d--;
    else if (ch === "," && d === 0) n++;
  }
  return txt.trim() ? n : 0;
};

test("INSERT de proposta: colunas, placeholders e valores batem", () => {
  const mo = src.match(/insert into proposals \(([^)]*)\)\s*\n\s*values \(([^)]*)\)[\s\S]*?\[([\s\S]*?)\]\s*\n\s*\);/);
  assert.ok(mo, "não achei o insert de proposals — o teste precisa ser atualizado junto com a rota");
  const colunas = contaTopo(mo[1]);
  const placeholders = contaTopo(mo[2]);
  const valores = contaTopo(mo[3]);
  assert.equal(placeholders, colunas, `${colunas} colunas mas ${placeholders} placeholders`);
  assert.equal(valores, colunas, `${colunas} colunas mas ${valores} valores`);
});

test("INSERT de proposta: placeholders são $1..$N, sem buraco nem repetido", () => {
  const mo = src.match(/insert into proposals \([^)]*\)\s*\n\s*values \(([^)]*)\)/);
  const nums = [...mo[1].matchAll(/\$(\d+)/g)].map((m) => Number(m[1]));
  assert.deepEqual(nums, nums.map((_, i) => i + 1), "sequência de placeholders quebrada");
});

test("UPDATE de proposta: maior placeholder é igual ao número de valores", () => {
  const mo = src.match(/update proposals set ([\s\S]*?)where id=\$1 and user_id=\$2 returning \*`,\s*\n\s*\[([\s\S]*?)\]\s*\n\s*\);/);
  assert.ok(mo, "não achei o update de proposals");
  const maior = Math.max(...[...mo[0].matchAll(/\$(\d+)/g)].map((m) => Number(m[1])));
  assert.equal(contaTopo(mo[2]), maior, `update usa até $${maior} mas passa ${contaTopo(mo[2])} valores`);
});

test("toda coluna do INSERT também aparece no UPDATE", () => {
  const ins = src.match(/insert into proposals \(([^)]*)\)/)[1]
    .split(",").map((c) => c.trim())
    .filter((c) => !["user_id", "public_id"].includes(c)); // só existem na criação
  const up = src.match(/update proposals set ([\s\S]*?)where id=\$1/)[1];
  const faltando = ins.filter((c) => !new RegExp(`\\b${c}=`).test(up));
  assert.deepEqual(faltando, [], `colunas gravadas na criação mas não na edição: ${faltando.join(", ")}`);
});
