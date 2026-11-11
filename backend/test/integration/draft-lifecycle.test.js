import { test } from "node:test";
import assert from "node:assert/strict";
import { api, newUser, grantPlan, proposalBody } from "../helpers.js";
import { query } from "../../src/db.js";
import { publicId, PUBLIC_ID_ALPHABET } from "../../src/lib/ids.js";

const auth = (t) => ({ Authorization: `Bearer ${t}` });
const post = (t, body = proposalBody()) => api().post("/api/proposals").set(auth(t)).send(body);
const put = (t, id, body) => api().put(`/api/proposals/${id}`).set(auth(t)).send(body);
const setStatus = (t, id, status) => api().patch(`/api/proposals/${id}/status`).set(auth(t)).send({ status });
const usage = (t) => api().get("/api/proposals/usage").set(auth(t));
const usageRows = async (uid) => (await query("select count(*)::int as n from proposal_usage where user_id=$1", [uid])).rows[0].n;

// ---------------------------------------------------------------- autosave/cota

test("rascunho NÃO consome cota: salvar e editar não debita nada", async () => {
  const { token, user } = await newUser(); // Gratuito: 2 propostas
  const a = await post(token, proposalBody({ title: "Rascunho A" }));
  const b = await post(token, proposalBody({ title: "Rascunho B" }));
  const c = await post(token, proposalBody({ title: "Rascunho C" }));
  assert.deepEqual([a.status, b.status, c.status], [201, 201, 201], "pode guardar mais rascunhos do que a cota");
  assert.equal(a.body.proposal.status, "draft");
  // Autosave: várias gravações seguidas no mesmo rascunho.
  for (let i = 0; i < 4; i++) {
    const r = await put(token, a.body.proposal.id, proposalBody({ title: `Rascunho A v${i}` }));
    assert.equal(r.status, 200);
  }
  assert.equal(await usageRows(user.id), 0, "nenhum uso registrado enquanto é rascunho");
  assert.equal((await usage(token)).body.used, 0);
});

test("autosave persiste título, itens e MODELO; reabrir devolve o último estado", async () => {
  const { token, user } = await newUser();
  await grantPlan(user.id, "pro");
  const id = (await post(token, proposalBody({ title: "TESTE Proposta de QA", template: "minimal" }))).body.proposal.id;
  const saved = await put(token, id, proposalBody({
    title: "TESTE Proposta de QA ALTERADA", template: "bold", scope: "novo escopo",
    items: [{ desc: "Item novo", value: "2500", hidden: false }],
  }));
  assert.equal(saved.status, 200);
  const again = await api().get(`/api/proposals/${id}`).set(auth(token));
  assert.equal(again.body.proposal.title, "TESTE Proposta de QA ALTERADA");
  assert.equal(again.body.proposal.template, "bold", "a troca de modelo tem que sobreviver ao recarregar");
  assert.equal(again.body.proposal.scope, "novo escopo");
  assert.equal(again.body.proposal.value, 2500);
  assert.equal(again.body.proposal.status, "draft");
});

test("concluir debita a cota UMA vez, mesmo com cliques repetidos", async () => {
  const { token, user } = await newUser();
  const id = (await post(token)).body.proposal.id;
  const [r1, r2, r3] = await Promise.all([setStatus(token, id, "sent"), setStatus(token, id, "sent"), setStatus(token, id, "sent")]);
  assert.deepEqual([r1.status, r2.status, r3.status], [200, 200, 200]);
  assert.equal(await usageRows(user.id), 1, "três cliques, um débito");
  assert.equal((await setStatus(token, id, "sent")).status, 200);
  assert.equal(await usageRows(user.id), 1, "concluir de novo não debita de novo");
});

test("Gratuito: a 3ª CONCLUSÃO é bloqueada e a proposta continua rascunho", async () => {
  const { token, user } = await newUser();
  const ids = [];
  for (let i = 0; i < 3; i++) ids.push((await post(token, proposalBody({ title: `P${i}` }))).body.proposal.id);
  assert.equal((await setStatus(token, ids[0], "sent")).status, 200);
  assert.equal((await setStatus(token, ids[1], "sent")).status, 200);
  const third = await setStatus(token, ids[2], "sent");
  assert.equal(third.status, 402);
  assert.equal(third.body.limitReached, true);
  const { rows } = await query("select status from proposals where id=$1", [ids[2]]);
  assert.equal(rows[0].status, "draft", "bloqueada no teto: não pode ter virado enviada");
  assert.equal(await usageRows(user.id), 2);
});

test("proposta concluída não volta a ser rascunho (409) e segue imutável", async () => {
  const { token } = await newUser();
  const id = (await post(token)).body.proposal.id;
  await setStatus(token, id, "sent");
  assert.equal((await setStatus(token, id, "draft")).status, 409);
  assert.equal((await put(token, id, proposalBody({ title: "mexendo depois" }))).status, 409);
  // Decisão manual do dono continua funcionando.
  assert.equal((await setStatus(token, id, "accepted")).status, 200);
  assert.equal((await setStatus(token, id, "sent")).status, 200, "reabrir (aceita -> enviada) continua permitido");
});

test("assinatura vencida não conclui (402 suspended) e não debita", async () => {
  const { token, user } = await newUser();
  await grantPlan(user.id, "pro");
  const id = (await post(token)).body.proposal.id;
  await query("update users set current_period_end = now() - interval '5 days' where id=$1", [user.id]);
  const r = await setStatus(token, id, "sent");
  assert.equal(r.status, 402);
  assert.equal(r.body.suspended, true);
  assert.equal(await usageRows(user.id), 0);
});

test("criação idempotente: repetir com a mesma chave não duplica o rascunho", async () => {
  const { token, user } = await newUser();
  const ref = "d_mwaw00zk89r73";
  // Primeira gravação "se perde" e o navegador tenta de novo, já com mais texto.
  const [a, b] = await Promise.all([
    post(token, { ...proposalBody({ title: "v1" }), clientRef: ref }),
    post(token, { ...proposalBody({ title: "v1" }), clientRef: ref }),
  ]);
  assert.equal(a.status, 201); assert.equal(b.status, 201);
  assert.equal(a.body.proposal.id, b.body.proposal.id, "mesma chave, mesma proposta");
  const c = await post(token, { ...proposalBody({ title: "v2 depois do F5" }), clientRef: ref });
  assert.equal(c.status, 201);
  assert.equal(c.body.proposal.id, a.body.proposal.id);
  assert.equal(c.body.proposal.publicId, a.body.proposal.publicId, "o link não muda");
  const { rows } = await query("select title from proposals where user_id=$1", [user.id]);
  assert.equal(rows.length, 1, "um único rascunho no banco");
  assert.equal(rows[0].title, "v2 depois do F5", "vale a versão mais recente");
  // Outra conta pode ter a mesma chave sem conflito, e não enxerga a proposta alheia.
  const other = await newUser();
  const o = await post(other.token, { ...proposalBody({ title: "de outra conta" }), clientRef: ref });
  assert.equal(o.status, 201);
  assert.notEqual(o.body.proposal.id, a.body.proposal.id);
  assert.equal((await query("select title from proposals where id=$1", [a.body.proposal.id])).rows[0].title, "v2 depois do F5");
  // Depois de concluída, a chave não reabre a edição nem cria outra.
  await setStatus(token, a.body.proposal.id, "sent");
  const late = await post(token, { ...proposalBody({ title: "mexendo depois de enviar" }), clientRef: ref });
  assert.equal(late.status, 409);
  assert.equal((await query("select title, status from proposals where id=$1", [a.body.proposal.id])).rows[0].title, "v2 depois do F5");
  assert.equal(await usageRows(user.id), 1);
  // Busca pelo id provisório: só a própria conta enxerga.
  const mine = await api().get(`/api/proposals/by-ref/${ref}`).set(auth(token));
  assert.equal(mine.status, 200);
  assert.equal(mine.body.proposal.id, a.body.proposal.id);
  const theirs = await api().get(`/api/proposals/by-ref/${ref}`).set(auth(other.token));
  assert.equal(theirs.body.proposal.id, o.body.proposal.id, "cada conta só acha a sua");
  const third = await newUser();
  assert.equal((await api().get(`/api/proposals/by-ref/${ref}`).set(auth(third.token))).status, 404);
  assert.equal((await api().get("/api/proposals/by-ref/lixo").set(auth(token))).status, 404);
  // Chave fora do formato é ignorada (cria normalmente, sem chave).
  const junk = await post(token, { ...proposalBody({ title: "sem chave" }), clientRef: "'; drop table proposals;--" });
  assert.equal(junk.status, 201);
});

// ---------------------------------------------------------------- rota/permissão

test("rascunho de outra conta é invisível: GET, PUT e PATCH dão 404", async () => {
  const a = await newUser();
  const b = await newUser();
  const id = (await post(a.token)).body.proposal.id;
  assert.equal((await api().get(`/api/proposals/${id}`).set(auth(b.token))).status, 404);
  assert.equal((await put(b.token, id, proposalBody({ title: "invasão" }))).status, 404);
  assert.equal((await setStatus(b.token, id, "sent")).status, 404);
  assert.equal((await api().get("/api/proposals/00000000-0000-0000-0000-000000000000").set(auth(a.token))).status, 404, "id inexistente");
  const { rows } = await query("select title, status from proposals where id=$1", [id]);
  assert.equal(rows[0].title, "Proposta Teste");
  assert.equal(rows[0].status, "draft");
});

// ---------------------------------------------------------------- link público

test("rascunho NÃO tem link público: ver, registrar visualização e aceitar dão 404", async () => {
  const { token } = await newUser();
  const p = (await post(token)).body.proposal;
  assert.equal((await api().get(`/api/public/${p.publicId}`)).status, 404);
  assert.equal((await api().post(`/api/public/${p.publicId}/view`).set("User-Agent", "Mozilla/5.0 Chrome")).status, 404);
  assert.equal((await api().post(`/api/public/${p.publicId}/accept`)).status, 404);
  const { rows } = await query("select status from proposals where id=$1", [p.id]);
  assert.equal(rows[0].status, "draft", "aceitar um rascunho pelo link não pode mudar nada");
  // Depois de concluir, o MESMO link passa a funcionar (não é gerado outro).
  await setStatus(token, p.id, "sent");
  const live = await api().get(`/api/public/${p.publicId}`);
  assert.equal(live.status, 200);
  assert.equal(live.body.proposal.decidedAt, null);
});

test("aceite: cliques simultâneos geram UM evento e devolvem a data real", async () => {
  const { token } = await newUser();
  const p = (await post(token)).body.proposal;
  await setStatus(token, p.id, "sent");
  const rs = await Promise.all([1, 2, 3, 4].map(() => api().post(`/api/public/${p.publicId}/accept`)));
  rs.forEach((r) => { assert.equal(r.status, 200); assert.equal(r.body.status, "accepted"); assert.ok(r.body.decidedAt); });
  const ev = await query("select created_at from proposal_events where proposal_id=$1 and type='accepted'", [p.id]);
  assert.equal(ev.rows.length, 1, "um único evento de aceite");
  // Abrir de novo (F5 depois do aceite) mostra a mesma data.
  const again = await api().get(`/api/public/${p.publicId}`);
  assert.equal(again.body.proposal.status, "accepted");
  assert.equal(new Date(again.body.proposal.decidedAt).getTime(), new Date(ev.rows[0].created_at).getTime());
  // Tentar aceitar depois: não cria evento novo nem muda a data.
  const late = await api().post(`/api/public/${p.publicId}/accept`);
  assert.equal(late.body.already, true);
  assert.equal((await query("select count(*)::int as n from proposal_events where proposal_id=$1 and type='accepted'", [p.id])).rows[0].n, 1);
  // Recusar algo já aceito não troca o status.
  assert.equal((await api().post(`/api/public/${p.publicId}/decline`)).body.status, "accepted");
});

// ---------------------------------------------------------------- identificadores

test("IDs públicos novos não usam I, l, 1, 0 nem O; os antigos continuam válidos", async () => {
  for (const ch of ["I", "l", "1", "0", "O"]) assert.ok(!PUBLIC_ID_ALPHABET.includes(ch), `alfabeto ainda tem ${ch}`);
  const seen = new Set();
  for (let i = 0; i < 4000; i++) {
    const id = publicId();
    assert.equal(id.length, 12);
    assert.ok(!/[Il10O]/.test(id), `id ambíguo gerado: ${id}`);
    seen.add(id);
  }
  assert.equal(seen.size, 4000, "sem colisão na amostra");
  // Link antigo, gerado com o alfabeto anterior, continua abrindo.
  const { user } = await newUser();
  await query("insert into proposals (user_id, public_id, client, title, status) values ($1,'RpIUoEm1ykNy','Cliente Antigo','Proposta antiga','sent')", [user.id]);
  const old = await api().get("/api/public/RpIUoEm1ykNy");
  assert.equal(old.status, 200);
  assert.equal(old.body.proposal.title, "Proposta antiga");
});

// ---------------------------------------------------------------- indicadores

test("rascunho no servidor não contamina os indicadores do painel", async () => {
  const { token } = await newUser();
  await post(token, proposalBody({ client: "Só Rascunho", title: "R1" }));
  const sent = (await post(token, proposalBody({ client: "TESTE Cliente QA", title: "Enviada", items: [{ desc: "x", value: "1500", hidden: false }] }))).body.proposal;
  await setStatus(token, sent.id, "sent");
  await api().post(`/api/public/${sent.publicId}/accept`);
  const d = (await api().get("/api/proposals/dashboard").set(auth(token))).body;
  assert.equal(d.kpis.receitaTotal, 1500);
  assert.equal(d.kpis.contratosFechados, 1);
  assert.equal(d.kpis.clientes, 1, "cliente de rascunho não entra na carteira");
  assert.equal(d.kpis.emNegociacao, 0);
  assert.equal(d.kpis.criadasMes, 1, "rascunho não conta como proposta do mês");
  assert.equal(d.kpis.taxaAceitacao, 100);
  assert.equal(d.funil.rascunho, 1);
  const st = (await api().get("/api/proposals/stats").set(auth(token))).body;
  assert.equal(st.kpis.enviadas, 1);
  assert.equal(st.kpis.conversao, 100);
  assert.equal(st.clients.length, 1);
});
