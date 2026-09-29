import { test } from "node:test";
import assert from "node:assert/strict";
import { api } from "../helpers.js";

test("/health responde ok sem tocar no banco", async () => {
  const r = await api().get("/health");
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { ok: true });
});

test("/health/db consulta o banco e responde 200", async () => {
  const r = await api().get("/health/db");
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { ok: true }, "a resposta nao pode ter nenhum campo alem de ok");
});

// Este e o teste que guarda a propriedade de seguranca: o corpo da resposta
// nao pode conter NADA sobre a conexao, nem quando tudo da certo. Se um dia
// alguem "melhorar" a rota devolvendo o erro ou a versao do Postgres, quebra aqui.
test("/health/db nunca devolve detalhe de conexao no corpo", async () => {
  const r = await api().get("/health/db");
  const corpo = JSON.stringify(r.body).toLowerCase();
  for (const termo of ["postgres", "supabase", "senha", "password", "5432", "host", "pooler", "select"]) {
    assert.ok(!corpo.includes(termo), `o corpo nao pode conter "${termo}", mas veio: ${corpo}`);
  }
});

// A rota fica fora do fallback do SPA: se cair no fallback, devolve o index.html
// (HTML, status 200) e o monitor acharia que esta tudo bem com o banco caido.
test("/health/db devolve JSON, nunca o index.html do SPA", async () => {
  const r = await api().get("/health/db");
  assert.match(r.headers["content-type"] || "", /application\/json/);
});
