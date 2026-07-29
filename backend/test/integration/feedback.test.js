import { test } from "node:test";
import assert from "node:assert/strict";
import { api, newUser } from "../helpers.js";

// "Relatar problema": só email (sem tabela). Em teste, sem SMTP, o envio cai no
// modo dev (console) e a rota responde 201. Aqui checamos auth e validação.

test("feedback exige autenticação (401 sem token)", async () => {
  const res = await api().post("/api/feedback").send({ category: "bug", message: "algo quebrou" });
  assert.equal(res.status, 401);
});

test("feedback válido responde 201", async () => {
  const { token } = await newUser();
  const res = await api().post("/api/feedback")
    .set("Authorization", `Bearer ${token}`)
    .send({ category: "sugestao", message: "seria bom ter modo escuro", pageUrl: "http://localhost:5173/app" });
  assert.equal(res.status, 201);
  assert.equal(res.body.ok, true);
});

test("feedback com mensagem muito curta dá 400", async () => {
  const { token } = await newUser();
  const res = await api().post("/api/feedback")
    .set("Authorization", `Bearer ${token}`)
    .send({ category: "bug", message: "x" });
  assert.equal(res.status, 400);
});

test("feedback com categoria inválida dá 400", async () => {
  const { token } = await newUser();
  const res = await api().post("/api/feedback")
    .set("Authorization", `Bearer ${token}`)
    .send({ category: "reclamacao", message: "mensagem suficientemente longa" });
  assert.equal(res.status, 400);
});
