import { test } from "node:test";
import assert from "node:assert/strict";
import { api, newUser, grantPlan } from "../helpers.js";
import { query } from "../../src/db.js";

const auth = (t) => ({ Authorization: `Bearer ${t}` });
const elig = (t) => api().get("/api/billing/refund-eligibility").set(auth(t));
const ask = (t, reason = "arrependimento") => api().post("/api/billing/refund-request").set(auth(t)).send({ reason, message: "teste" });
const requests = async (uid) => (await query("select count(*)::int as n from refund_requests where user_id=$1", [uid])).rows[0].n;

let seq = 0;
async function pay(userId, { daysAgo = 0, interval = "month", status = "approved", plan = "pro" } = {}) {
  seq += 1;
  const id = `pay_${Date.now()}_${seq}`;
  await query(
    "insert into mp_payments(id,user_id,plan,interval,amount,status,created_at) values($1,$2,$3,$4,$5,$6, now() - make_interval(days => $7))",
    [id, userId, plan, interval, interval === "year" ? 312 : 29, status, daysAgo]
  );
  return id;
}

test("conta gratuita sem pagamento: não elegível e a chamada direta é barrada (403)", async () => {
  const { token, user } = await newUser();
  const e = await elig(token);
  assert.equal(e.status, 200);
  assert.equal(e.body.eligible, false);
  assert.equal(e.body.code, "no_payment");
  const r = await ask(token);
  assert.equal(r.status, 403, "não basta esconder o botão: o endpoint tem que recusar");
  assert.equal(r.body.code, "no_payment");
  assert.equal(await requests(user.id), 0, "nenhum pedido pode ter sido gravado");
});

test("pagou e está dentro dos 7 dias: elegível, integral; segundo pedido dá 409", async () => {
  const { token, user } = await newUser();
  await grantPlan(user.id, "pro");
  const payId = await pay(user.id, { daysAgo: 2 });
  const e = await elig(token);
  assert.equal(e.body.eligible, true);
  assert.equal(e.body.mode, "full");
  const r = await ask(token);
  assert.equal(r.status, 201);
  assert.equal(r.body.withinRegret, true);
  const { rows } = await query("select payment_id, within_regret, amount from refund_requests where user_id=$1", [user.id]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].payment_id, payId);
  assert.equal(rows[0].within_regret, true);
  // Reembolso já solicitado.
  const after = await elig(token);
  assert.equal(after.body.eligible, false);
  assert.equal(after.body.code, "request_open");
  assert.equal((await ask(token)).status, 409);
  assert.equal(await requests(user.id), 1);
});

test("pedidos simultâneos para o mesmo pagamento gravam UM só", async () => {
  const { token, user } = await newUser();
  await grantPlan(user.id, "pro");
  await pay(user.id, { daysAgo: 1 });
  const rs = await Promise.all([ask(token), ask(token), ask(token)]);
  assert.equal(rs.filter((r) => r.status === 201).length, 1);
  assert.equal(rs.filter((r) => r.status === 409).length, 2);
  assert.equal(await requests(user.id), 1);
});

test("plano mensal fora dos 7 dias: não elegível (403)", async () => {
  const { token, user } = await newUser();
  await grantPlan(user.id, "pro");
  await pay(user.id, { daysAgo: 12 });
  const e = await elig(token);
  assert.equal(e.body.eligible, false);
  assert.equal(e.body.code, "out_of_window");
  assert.equal((await ask(token)).status, 403);
  assert.equal(await requests(user.id), 0);
});

test("plano anual fora dos 7 dias e dentro do período: elegível, proporcional", async () => {
  const { token, user } = await newUser();
  await grantPlan(user.id, "pro");
  await pay(user.id, { daysAgo: 60, interval: "year" });
  const e = await elig(token);
  assert.equal(e.body.eligible, true);
  assert.equal(e.body.mode, "prorata");
  const r = await ask(token, "nao_atendeu");
  assert.equal(r.status, 201);
  assert.equal(r.body.withinRegret, false);
});

test("pagamento que não é 'approved' (pendente, estornado, contestado) não dá direito a pedido", async () => {
  for (const status of ["pending", "refunded", "charged_back", "rejected"]) {
    const { token, user } = await newUser();
    await pay(user.id, { daysAgo: 1, status });
    assert.equal((await elig(token)).body.code, "no_payment", status);
    assert.equal((await ask(token)).status, 403, status);
    assert.equal(await requests(user.id), 0, status);
  }
});

test("pagamento de outra conta não habilita o reembolso", async () => {
  const a = await newUser();
  const b = await newUser();
  await pay(a.user.id, { daysAgo: 1 });
  assert.equal((await elig(b.token)).body.eligible, false);
  assert.equal((await ask(b.token)).status, 403);
});
