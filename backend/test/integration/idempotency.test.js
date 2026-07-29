import { test } from "node:test";
import assert from "node:assert/strict";
import { query } from "../../src/db.js";

// O webhook do Mercado Pago libera o plano só se conseguir INSERIR o pagamento
// em mp_payments (PK = id do pagamento). Uma 2ª notificação do mesmo pagamento
// não insere nada, então o plano nunca é liberado em dobro. Testa esse mecanismo.
const insertPayment = (id) =>
  query(
    "insert into mp_payments(id,user_id,plan,interval,amount,status) values($1,null,'pro','month',29,'approved') on conflict (id) do nothing returning id",
    [id]
  );

test("mesmo pagamento só é processado uma vez (idempotência por PK)", async () => {
  const first = await insertPayment("PAY-IDEMP-1");
  assert.equal(first.rows.length, 1, "1ª notificação grava o pagamento");

  const second = await insertPayment("PAY-IDEMP-1");
  assert.equal(second.rows.length, 0, "2ª notificação (mesmo id) NÃO grava -> não libera de novo");

  const count = await query("select count(*)::int as n from mp_payments where id=$1", ["PAY-IDEMP-1"]);
  assert.equal(count.rows[0].n, 1, "existe apenas 1 registro do pagamento");
});

test("pagamentos diferentes são processados normalmente", async () => {
  await insertPayment("PAY-A");
  await insertPayment("PAY-B");
  const total = await query("select count(*)::int as n from mp_payments");
  assert.equal(total.rows[0].n, 2);
});
