import request from "supertest";
import app from "../src/app.js";
import { query } from "../src/db.js";
import { makeCpf } from "./data.js";

export { makeCpf, proposalBody } from "./data.js";

// Cliente HTTP de teste (não abre porta; fala com o app em memória).
export const api = () => request(app);

let seq = 0;
// Cria uma conta de teste e devolve { token, user, cpf, email, password }.
export async function newUser(overrides = {}) {
  seq += 1;
  const email = overrides.email || `user${seq}_${Date.now()}@teste.com`;
  const cpf = overrides.cpf || makeCpf(100000000 + seq);
  const password = overrides.password || "senhaForte123";
  const name = overrides.name || `Usuário ${seq}`;
  const res = await request(app).post("/api/auth/register").send({ name, email, cpf, password });
  if (res.status !== 201) throw new Error(`falha ao criar usuário de teste: ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.token, user: res.body.user, cpf, email, password };
}

// Coloca um plano ativo no usuário (simula pagamento aprovado), sem passar pelo webhook.
export async function grantPlan(userId, plan) {
  await query(
    "update users set plan=$2, subscription_status='active', current_period_end=now() + interval '30 days' where id=$1",
    [userId, plan]
  );
}
