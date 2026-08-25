import { test } from "node:test";
import assert from "node:assert/strict";
import { api, newUser, proposalBody } from "../helpers.js";

const create = (token, body) =>
  api().post("/api/proposals").set("Authorization", `Bearer ${token}`).send(body);
const get = (token, id) =>
  api().get(`/api/proposals/${id}`).set("Authorization", `Bearer ${token}`);
const update = (token, id, body) =>
  api().put(`/api/proposals/${id}`).set("Authorization", `Bearer ${token}`).send(body);

test("coverPos: salva na criação e recupera ao abrir a proposta", async () => {
  const { token } = await newUser();
  const r = await create(token, proposalBody({ cover: "/uploads/x.png", coverPos: "30,70" }));
  assert.equal(r.status, 201);
  assert.equal(r.body.proposal.coverPos, "30,70", "coverPos deveria persistir na criação");

  const g = await get(token, r.body.proposal.id);
  assert.equal(g.status, 200);
  assert.equal(g.body.proposal.coverPos, "30,70", "coverPos deveria voltar ao abrir a proposta");
});

test("coverPos: é atualizado ao editar o rascunho", async () => {
  const { token } = await newUser();
  const r = await create(token, proposalBody({ cover: "/uploads/x.png", coverPos: "10,10" }));
  assert.equal(r.status, 201);
  const up = await update(token, r.body.proposal.id, proposalBody({ cover: "/uploads/x.png", coverPos: "80,20" }));
  assert.equal(up.status, 200);
  assert.equal(up.body.proposal.coverPos, "80,20", "editar deveria salvar o novo enquadramento");
});

test("coverPos: proposta sem posicionamento volta string vazia (compat com antigas)", async () => {
  const { token } = await newUser();
  const r = await create(token, proposalBody({ title: "Sem enquadramento" }));
  assert.equal(r.status, 201);
  assert.equal(r.body.proposal.coverPos, "", "sem coverPos deve voltar vazio, não quebrar");
});

test("coverPos: valor fora do formato x,y é rejeitado na validação (400)", async () => {
  const { token } = await newUser();
  const bad = await create(token, proposalBody({ coverPos: "javascript:alert(1)" }));
  assert.equal(bad.status, 400, "coverPos inválido não pode ser aceito");
});
