import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { before, beforeEach, after } from "node:test";
import EmbeddedPostgres from "embedded-postgres";

// Harness dos testes de integração: sobe um Postgres REAL embutido (sem root,
// sem Docker), roda as migrations, limpa as tabelas antes de cada teste e derruba
// o banco no fim. Carregado via `--import` antes de qualquer arquivo de teste.
//
// A porta/credenciais batem exatamente com o DATABASE_URL do .env.test.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "../src/migrations");

const pg = new EmbeddedPostgres({
  databaseDir: path.join(__dirname, ".pgdata"),
  user: "test",
  password: "test",
  port: 54329,
  persistent: false, // apaga os dados ao parar
});

// Tabelas de dados (não inclui _migrations, que guarda o schema aplicado).
const DATA_TABLES = [
  "mp_payments", "google_email_accounts", "proposal_events", "proposal_usage",
  "billing_events", "password_codes", "proposals", "users",
];

async function runMigrations(query) {
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, f), "utf8");
    await query(sql);
  }
}

before(async () => {
  fs.rmSync(path.join(__dirname, ".pgdata"), { recursive: true, force: true }); // fresh
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("manda_test");
  // Importa o pool DEPOIS do banco no ar (o db.js lê o DATABASE_URL do .env.test).
  const { query } = await import("../src/db.js");
  await runMigrations(query);
});

beforeEach(async () => {
  const { query } = await import("../src/db.js");
  await query(`truncate ${DATA_TABLES.join(", ")} restart identity cascade`);
});

after(async () => {
  try {
    const { pool } = await import("../src/db.js");
    await pool.end();
  } catch { /* ignore */ }
  await pg.stop();
});
