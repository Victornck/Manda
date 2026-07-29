import { test } from "node:test";
import assert from "node:assert/strict";
import { api, newUser, grantPlan, proposalBody } from "../helpers.js";

test("Básico não pode usar template de plano superior (402)", async () => {
  const { token, user } = await newUser();
  await grantPlan(user.id, "basic");
  const res = await api().post("/api/proposals")
    .set("Authorization", `Bearer ${token}`)
    .send(proposalBody({ template: "aurora" })); // aurora é Pro/Business
  assert.equal(res.status, 402);
});

test("Pro consegue usar o mesmo template", async () => {
  const { token, user } = await newUser();
  await grantPlan(user.id, "pro");
  const res = await api().post("/api/proposals")
    .set("Authorization", `Bearer ${token}`)
    .send(proposalBody({ template: "aurora" }));
  assert.equal(res.status, 201);
});

test("proposta concluída é IMUTÁVEL: editar depois de enviada dá 409", async () => {
  const { token, user } = await newUser();
  await grantPlan(user.id, "pro");

  const created = await api().post("/api/proposals").set("Authorization", `Bearer ${token}`).send(proposalBody());
  assert.equal(created.status, 201);
  const id = created.body.proposal.id;

  const concluir = await api().patch(`/api/proposals/${id}/status`).set("Authorization", `Bearer ${token}`).send({ status: "sent" });
  assert.equal(concluir.status, 200);

  const editar = await api().put(`/api/proposals/${id}`).set("Authorization", `Bearer ${token}`).send(proposalBody({ title: "Tentando alterar" }));
  assert.equal(editar.status, 409, "não pode editar proposta já enviada");
});

test("proposta de um usuário não é acessível por outro (404)", async () => {
  const a = await newUser(); await grantPlan(a.user.id, "pro");
  const b = await newUser();

  const created = await api().post("/api/proposals").set("Authorization", `Bearer ${a.token}`).send(proposalBody());
  const id = created.body.proposal.id;

  const alheio = await api().get(`/api/proposals/${id}`).set("Authorization", `Bearer ${b.token}`);
  assert.equal(alheio.status, 404, "B não vê proposta de A");
});
