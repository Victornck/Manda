import { test } from "node:test";
import assert from "node:assert/strict";
import { api, newUser, grantPlan, proposalBody } from "../helpers.js";
import { query } from "../../src/db.js";

const create = (token, body = proposalBody()) =>
  api().post("/api/proposals").set("Authorization", `Bearer ${token}`).send(body);
const usage = (token) => api().get("/api/proposals/usage").set("Authorization", `Bearer ${token}`);

// Assinante com ciclo ancorado numa data: quota_anchor define quando a cota vira.
const setCycle = (userId, { anchorDaysAgo = 0, endsInDays = 30 } = {}) =>
  query(
    `update users set quota_anchor = now() - make_interval(days => $2),
                      current_period_end = now() + make_interval(days => $3),
                      subscription_status='active'
      where id=$1`,
    [userId, anchorDaysAgo, endsInDays]
  );

test("cota NÃO acumula: o que sobra do ciclo some quando o ciclo vira", async () => {
  const { token, user } = await newUser();
  await grantPlan(user.id, "basic"); // 5 por ciclo
  // Ciclo anterior (assinou há 40 dias): usou só 1 proposta.
  await setCycle(user.id, { anchorDaysAgo: 40 });
  await query("insert into proposal_usage (user_id, created_at) values ($1, now() - interval '35 days')", [user.id]);

  const u = await usage(token);
  assert.equal(u.status, 200);
  // O ciclo atual começou há 10 dias (aniversário dos 40), então o uso antigo não conta.
  assert.equal(u.body.used, 0, "uso do ciclo anterior não pode contar no ciclo atual");
  assert.equal(u.body.limit, 5, "a sobra do ciclo anterior NÃO vira crédito");
});

test("cota conta o uso do ciclo ATUAL (não zera no meio dele)", async () => {
  const { token, user } = await newUser();
  await grantPlan(user.id, "basic");
  await setCycle(user.id, { anchorDaysAgo: 10 }); // ciclo começou há 10 dias
  await query("insert into proposal_usage (user_id, created_at) values ($1, now() - interval '5 days')", [user.id]);

  const u = await usage(token);
  assert.equal(u.body.used, 1, "uso feito dentro do ciclo atual deve contar");
});

test("virar o mês do calendário no meio do ciclo NÃO dá cota nova", async () => {
  const { token, user } = await newUser();
  await grantPlan(user.id, "basic");
  await setCycle(user.id, { anchorDaysAgo: 20 }); // ciclo em andamento
  // 5 propostas dentro do ciclo atual: cota estourada.
  for (let i = 0; i < 5; i++) {
    await query("insert into proposal_usage (user_id, created_at) values ($1, now() - interval '2 days')", [user.id]);
  }
  const r = await create(token);
  assert.equal(r.status, 402, "com a cota do ciclo cheia, criar deve ser bloqueado");
  assert.equal(r.body.limitReached, true);
});

test("assinatura vencida (passada a carência) suspende: não cria e NÃO vira grátis", async () => {
  const { token, user } = await newUser();
  await grantPlan(user.id, "pro");
  await query(
    "update users set current_period_end = now() - interval '5 days', quota_anchor = now() - interval '35 days' where id=$1",
    [user.id]
  );
  const r = await create(token);
  assert.equal(r.status, 402, "assinatura vencida não pode criar proposta");
  assert.equal(r.body.suspended, true, "deve responder como suspensa, não como limite");

  // O plano é PRESERVADO (não vira 'free' com 2 propostas de brinde).
  const { rows } = await query("select plan from users where id=$1", [user.id]);
  assert.equal(rows[0].plan, "pro", "o plano não pode ser rebaixado para grátis");

  const u = await usage(token);
  assert.equal(u.body.suspended, true);
  assert.equal(u.body.plan, "pro");
});

test("dentro da carência de 3 dias ainda funciona", async () => {
  const { token, user } = await newUser();
  await grantPlan(user.id, "pro");
  await query(
    "update users set current_period_end = now() - interval '1 day', quota_anchor = now() - interval '31 days' where id=$1",
    [user.id]
  );
  const r = await create(token);
  assert.equal(r.status, 201, "1 dia de atraso está na carência e deve continuar funcionando");
});

test("pagar de novo reativa e zera a cota do novo ciclo", async () => {
  const { token, user } = await newUser();
  await grantPlan(user.id, "basic");
  // Vencida e com a cota do ciclo antigo estourada.
  await query(
    "update users set current_period_end = now() - interval '10 days', quota_anchor = now() - interval '40 days' where id=$1",
    [user.id]
  );
  for (let i = 0; i < 5; i++) {
    await query("insert into proposal_usage (user_id, created_at) values ($1, now() - interval '20 days')", [user.id]);
  }
  assert.equal((await create(token)).status, 402, "vencida deve bloquear");

  // Pagamento aprovado: é o que o webhook faz (novo período + nova âncora).
  await query(
    "update users set subscription_status='active', quota_anchor=now(), current_period_end = now() + interval '30 days' where id=$1",
    [user.id]
  );
  const u = await usage(token);
  assert.equal(u.body.suspended, false, "após pagar, a conta volta ao normal");
  assert.equal(u.body.used, 0, "o novo ciclo começa com a cota zerada");
  assert.equal((await create(token)).status, 201, "após pagar, volta a criar proposta");
});

test("plano Gratuito segue com teto vitalício (não é afetado pelo ciclo)", async () => {
  const { token } = await newUser();
  assert.equal((await create(token, proposalBody({ title: "G1" }))).status, 201);
  assert.equal((await create(token, proposalBody({ title: "G2" }))).status, 201);
  const third = await create(token, proposalBody({ title: "G3" }));
  assert.equal(third.status, 402, "grátis continua com teto vitalício de 2");
  assert.equal(third.body.limitReached, true);
});
