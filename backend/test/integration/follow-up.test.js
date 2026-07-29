import { test } from "node:test";
import assert from "node:assert/strict";
import { api, newUser, grantPlan, proposalBody } from "../helpers.js";
import { query } from "../../src/db.js";

// Cria uma proposta já concluída (enviada) e marca que foi enviada por e-mail há
// N dias, inserindo o evento 'emailed' com data no passado (é o que o follow-up usa).
async function sentProposal({ token, user }, { emailedDaysAgo = 4, clientEmail = "cliente@teste.com", status = "sent" } = {}) {
  await grantPlan(user.id, "pro");
  const created = await api().post("/api/proposals").set("Authorization", `Bearer ${token}`).send(proposalBody({ clientEmail }));
  const id = created.body.proposal.id;
  await api().patch(`/api/proposals/${id}/status`).set("Authorization", `Bearer ${token}`).send({ status });
  await query(
    "insert into proposal_events(proposal_id, type, created_at) values ($1,'emailed', now() - ($2 || ' days')::interval)",
    [id, String(emailedDaysAgo)]
  );
  return id;
}

test("follow-ups lista proposta enviada e parada há dias", async () => {
  const u = await newUser();
  const id = await sentProposal(u, { emailedDaysAgo: 4 });
  const res = await api().get("/api/proposals/follow-ups").set("Authorization", `Bearer ${u.token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.followUps.length, 1);
  assert.equal(res.body.followUps[0].id, id);
  assert.ok(res.body.followUps[0].daysSince >= 3);
});

test("follow-ups NÃO lista proposta enviada há pouco tempo", async () => {
  const u = await newUser();
  await sentProposal(u, { emailedDaysAgo: 0 });
  const res = await api().get("/api/proposals/follow-ups").set("Authorization", `Bearer ${u.token}`);
  assert.equal(res.body.followUps.length, 0);
});

test("follow-ups NÃO lista proposta já aceita", async () => {
  const u = await newUser();
  await sentProposal(u, { emailedDaysAgo: 5, status: "accepted" });
  const res = await api().get("/api/proposals/follow-ups").set("Authorization", `Bearer ${u.token}`);
  assert.equal(res.body.followUps.length, 0);
});

test("remind em rascunho é bloqueado (409)", async () => {
  const u = await newUser();
  await grantPlan(u.user.id, "pro");
  const created = await api().post("/api/proposals").set("Authorization", `Bearer ${u.token}`).send(proposalBody({ clientEmail: "c@t.com" }));
  const res = await api().post(`/api/proposals/${created.body.proposal.id}/remind`).set("Authorization", `Bearer ${u.token}`);
  assert.equal(res.status, 409);
});

test("remind sem e-mail do cliente dá 400", async () => {
  const u = await newUser();
  const id = await sentProposal(u, { emailedDaysAgo: 4, clientEmail: "" });
  const res = await api().post(`/api/proposals/${id}/remind`).set("Authorization", `Bearer ${u.token}`);
  assert.equal(res.status, 400);
});

test("remind respeita o cooldown (429 se lembrado há pouco)", async () => {
  const u = await newUser();
  const id = await sentProposal(u, { emailedDaysAgo: 4 });
  await query("update proposals set reminded_at = now() where id=$1", [id]);
  const res = await api().post(`/api/proposals/${id}/remind`).set("Authorization", `Bearer ${u.token}`);
  assert.equal(res.status, 429);
});

test("remind sem Gmail conectado pede conexão (409 needsConnect)", async () => {
  const u = await newUser();
  const id = await sentProposal(u, { emailedDaysAgo: 4 });
  const res = await api().post(`/api/proposals/${id}/remind`).set("Authorization", `Bearer ${u.token}`);
  assert.equal(res.status, 409);
  assert.equal(res.body.needsConnect, true);
});
