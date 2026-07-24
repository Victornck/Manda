import crypto from "node:crypto";
import { query } from "../db.js";
import { env } from "../env.js";

const TTL_MIN = 10;      // validade do código (minutos)
const MAX_ATTEMPTS = 5;  // tentativas de verificação erradas antes de invalidar

// Código de 6 dígitos, aleatório e uniforme (CSPRNG).
export const genCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

// Hash com "pepper" (JWT_SECRET): o código nunca fica em texto puro no banco, e
// quem só tiver acesso ao banco não consegue reverter sem também ter o segredo.
const hashCode = (code) =>
  crypto.createHmac("sha256", env.JWT_SECRET).update(String(code)).digest("hex");

// Higiene: apaga códigos expirados ou já usados — a tabela não acumula lixo.
// Roda a cada emissão/verificação; é barato (tabela minúscula, com índice).
const cleanup = () =>
  query("delete from password_codes where expires_at < now() or used_at is not null").catch(() => {});

// Cria um código novo, invalidando (apagando) os anteriores do mesmo propósito.
// Cooldown por CONTA (60s entre envios): mesmo um atacante trocando de IP não
// consegue usar o sistema para bombardear o email de alguém.
// Retorna { code } ou { cooldown: true }.
export async function issueCode(userId, purpose) {
  await cleanup();
  const { rows: recent } = await query(
    "select 1 from password_codes where user_id=$1 and purpose=$2 and created_at > now() - interval '60 seconds' limit 1",
    [userId, purpose]
  );
  if (recent.length) return { cooldown: true };
  const code = genCode();
  await query(
    "delete from password_codes where user_id=$1 and purpose=$2",
    [userId, purpose]
  );
  await query(
    `insert into password_codes (user_id, purpose, code_hash, expires_at)
     values ($1, $2, $3, now() + ($4 || ' minutes')::interval)`,
    [userId, purpose, hashCode(code), String(TTL_MIN)]
  );
  return { code };
}

// Verifica e consome (uso único). Retorna { ok:true } ou { ok:false, reason }.
// Acertou ou expirou → a linha é APAGADA na hora (nada fica para trás no banco).
export async function consumeCode(userId, purpose, code) {
  await cleanup();
  const { rows } = await query(
    `select * from password_codes
       where user_id=$1 and purpose=$2 and used_at is null
       order by created_at desc limit 1`,
    [userId, purpose]
  );
  const rec = rows[0];
  if (!rec) return { ok: false, reason: "Código inválido ou expirado. Peça um novo." };
  if (new Date(rec.expires_at) < new Date()) {
    await query("delete from password_codes where id=$1", [rec.id]).catch(() => {});
    return { ok: false, reason: "Código expirado. Peça um novo." };
  }
  if (rec.attempts >= MAX_ATTEMPTS) {
    await query("delete from password_codes where id=$1", [rec.id]).catch(() => {});
    return { ok: false, reason: "Muitas tentativas. Peça um novo código." };
  }

  const a = Buffer.from(hashCode(code), "hex");
  const b = Buffer.from(rec.code_hash, "hex");
  const match = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!match) {
    await query("update password_codes set attempts = attempts + 1 where id=$1", [rec.id]);
    return { ok: false, reason: "Código incorreto." };
  }
  await query("delete from password_codes where id=$1", [rec.id]); // uso único: some do banco
  return { ok: true };
}
