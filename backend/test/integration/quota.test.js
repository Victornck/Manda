import { test } from "node:test";
import assert from "node:assert/strict";
import { api, newUser, grantPlan, proposalBody } from "../helpers.js";

const create = (token, body = proposalBody()) =>
  api().post("/api/proposals").set("Authorization", `Bearer ${token}`).send(body);

test("usuário sem plano (free) não consegue criar proposta (402)", async () => {
  const { token } = await newUser();
  const res = await create(token);
  assert.equal(res.status, 402);
});

test("Básico cria até 5 no mês; a 6ª é bloqueada (402)", async () => {
  const { token, user } = await newUser();
  await grantPlan(user.id, "basic");
  for (let i = 1; i <= 5; i++) {
    const r = await create(token, proposalBody({ title: `P${i}` }));
    assert.equal(r.status, 201, `a ${i}ª proposta deveria ser criada`);
  }
  const sixth = await create(token, proposalBody({ title: "P6" }));
  assert.equal(sixth.status, 402, "a 6ª deve ser bloqueada pela cota");
});

test("cota é APPEND-ONLY: apagar propostas não reabre vaga", async () => {
  const { token, user } = await newUser();
  await grantPlan(user.id, "basic");
  const ids = [];
  for (let i = 1; i <= 5; i++) {
    const r = await create(token);
    ids.push(r.body.proposal.id);
  }
  // apaga 3 das 5
  for (const id of ids.slice(0, 3)) {
    const del = await api().delete(`/api/proposals/${id}`).set("Authorization", `Bearer ${token}`);
    assert.equal(del.status, 204);
  }
  // mesmo com 3 apagadas, o uso do mês continua 5 -> não dá pra burlar
  const again = await create(token);
  assert.equal(again.status, 402, "apagar e recriar não deve furar a cota");
});
