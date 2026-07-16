import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool, query } from "./db.js";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");

async function run() {
  await query("create table if not exists _migrations (name text primary key, run_at timestamptz default now())");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    const { rows } = await query("select 1 from _migrations where name=$1", [f]);
    if (rows.length) { console.log("• já aplicada:", f); continue; }
    const sql = fs.readFileSync(path.join(dir, f), "utf8");
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into _migrations(name) values($1)", [f]);
      await client.query("commit");
      console.log("✓ aplicada:", f);
    } catch (e) {
      await client.query("rollback");
      throw e;
    } finally {
      client.release();
    }
  }
  await pool.end();
  console.log("Migrations concluídas.");
}

run().catch((e) => { console.error("Falha na migration:", e.message); process.exit(1); });
