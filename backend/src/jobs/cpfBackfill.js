import { query } from "../db.js";
import { encryptCpf, cpfIndex } from "../lib/pii.js";

// Migra CPFs que ainda estão em texto puro para cifra + índice cego, e apaga o
// texto puro. Roda uma vez ao subir o servidor; é idempotente (só toca em quem
// ainda tem cpf preenchido e cpf_enc vazio).
export async function backfillCpf() {
  let rows;
  try {
    ({ rows } = await query(
      "select id, cpf from users where cpf is not null and cpf <> '' and cpf_enc is null"
    ));
  } catch { return; } // colunas ainda não existem (migration não rodou): ignora
  if (!rows.length) return;
  for (const u of rows) {
    const digits = String(u.cpf).replace(/\D/g, "");
    if (digits.length !== 11) continue;
    await query(
      "update users set cpf_enc=$2, cpf_hash=$3, cpf=null where id=$1",
      [u.id, encryptCpf(digits), cpfIndex(digits)]
    );
  }
  console.log(`[pii] ${rows.length} CPF(s) migrado(s) para cifra + índice cego.`);
}
