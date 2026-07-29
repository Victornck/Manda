import { test } from "node:test";
import assert from "node:assert/strict";
import { api, newUser, makeCpf } from "../helpers.js";

test("registro cria conta e devolve token + user (plano free)", async () => {
  const { token, user } = await newUser();
  assert.ok(token, "deve devolver token");
  assert.equal(user.plan, "free");
  assert.ok(user.email);
});

test("login com senha certa funciona; senha errada dá 401", async () => {
  const { email, password } = await newUser();

  const ok = await api().post("/api/auth/login").send({ email, password });
  assert.equal(ok.status, 200);
  assert.ok(ok.body.token);

  const bad = await api().post("/api/auth/login").send({ email, password: "errada999" });
  assert.equal(bad.status, 401);
  assert.ok(!bad.body.token);
});

test("não deixa criar duas contas com o mesmo CPF", async () => {
  const cpf = makeCpf(314159265);
  const first = await api().post("/api/auth/register").send({ name: "A", email: `a_${Date.now()}@t.com`, cpf, password: "senhaForte123" });
  assert.equal(first.status, 201);

  const dupe = await api().post("/api/auth/register").send({ name: "B", email: `b_${Date.now()}@t.com`, cpf, password: "senhaForte123" });
  assert.equal(dupe.status, 409);
});

test("/auth/me exige token válido", async () => {
  const semToken = await api().get("/api/auth/me");
  assert.equal(semToken.status, 401);

  const { token } = await newUser();
  const comToken = await api().get("/api/auth/me").set("Authorization", `Bearer ${token}`);
  assert.equal(comToken.status, 200);
  assert.ok(comToken.body.user.id);
});
