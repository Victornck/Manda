import pg from "pg";
import { env } from "./env.js";

// Pool de conexões: escalável (reusa conexões) e evita esgotar o Postgres.
export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  ssl: env.PGSSL ? { rejectUnauthorized: false } : false,
});

// Sempre parametrizado ($1, $2...) — nunca concatenar SQL (previne SQL injection).
export const query = (text, params) => pool.query(text, params);
