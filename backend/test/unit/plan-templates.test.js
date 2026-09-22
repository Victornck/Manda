import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BASIC_TEMPLATES, PLAN_LIMITS, templateAllowed } from "../../src/lib/plans.js";

// Quem pode usar qual modelo é decidido AQUI, no servidor (BASIC_TEMPLATES).
// A galeria no front precisa da mesma lista para desenhar o cadeado e o filtro
// "Gratuitos | Premium", e marca isso com `free: true` no registro dos modelos.
// São dois arquivos em dois pacotes npm diferentes, então não dá para importar
// um do outro sem mexer no build — este teste é o que impede os dois de
// divergirem em silêncio. Divergir significa, na prática, ou oferecer um modelo
// que o servidor vai recusar na hora de salvar, ou esconder um que é grátis.

const dir = path.dirname(fileURLToPath(import.meta.url));
const registro = fs.readFileSync(path.join(dir, "../../../frontend/src/templates/designs.jsx"), "utf8");

// Lê os ids marcados como grátis no registro, sem executar JSX.
const freeNoFront = [...registro.matchAll(/\{\s*id:\s*"([^"]+)"[^\n]*?\bfree:\s*true/g)].map((m) => m[1]);
// Todos os ids do registro, para o outro lado da conferência.
const todosNoFront = [...registro.matchAll(/^\s*\{\s*id:\s*"([^"]+)",\s*name:/gm)].map((m) => m[1]);

test("o registro do front declara algum modelo grátis", () => {
  assert.ok(freeNoFront.length > 0, "nenhum `free: true` encontrado — o regex ou o registro mudou");
  assert.ok(todosNoFront.length >= 12, `só ${todosNoFront.length} modelos lidos do registro`);
});

test("modelos grátis do front batem com BASIC_TEMPLATES do servidor", () => {
  assert.deepEqual([...freeNoFront].sort(), [...BASIC_TEMPLATES].sort(),
    "a galeria e o servidor discordam sobre quais modelos são gratuitos");
});

test("todo modelo marcado grátis é de fato liberado no plano free", () => {
  for (const id of freeNoFront) {
    assert.equal(templateAllowed("free", id), true, `${id} está marcado grátis mas o plano free recusa`);
  }
});

test("todo modelo NÃO marcado grátis é recusado no plano free", () => {
  for (const id of todosNoFront.filter((i) => !freeNoFront.includes(i))) {
    assert.equal(templateAllowed("free", id), false, `${id} não está marcado grátis mas o plano free aceita`);
  }
});

test("planos pagos superiores continuam com todos os modelos", () => {
  for (const plano of ["pro", "business"]) {
    assert.equal(PLAN_LIMITS[plano].templates, null, `${plano} deveria ter todos os modelos`);
    for (const id of todosNoFront) assert.equal(templateAllowed(plano, id), true, `${plano} recusa ${id}`);
  }
});
