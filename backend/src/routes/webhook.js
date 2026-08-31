import { Router } from "express";
import { query } from "../db.js";
import { mpConfigured, verifyWebhook, getPayment, getPreapproval, getAuthorizedPayment } from "../lib/mercadopago.js";
import { PLAN_PRICES_BRL, PERIOD_DAYS } from "../lib/plans.js";

const r = Router();

// Notificação do Mercado Pago. A FONTE DA VERDADE é rebuscar o pagamento na API
// do MP com o nosso access token (getPayment): só liberamos se ele estiver
// aprovado, apontar para um usuário real (external_reference) e o valor bater
// com o preço do plano. A assinatura é validada e registrada, mas não é o portão
// que trava tudo, porque o Checkout Pro nem sempre a envia de forma validável.
// Como ninguém consegue forjar um pagamento aprovado de verdade na sua conta,
// essa checagem via API já garante a segurança.
r.post("/", async (req, res) => {
  if (!mpConfigured()) return res.status(501).end();

  const type = String(req.query.type || req.query.topic || req.body?.type || "");
  const check = verifyWebhook(req);
  console.log(`[mp webhook] recebido: type=${type || "?"} id=${check.paymentId || "?"} assinatura=${check.ok ? "ok" : "sem match (confirmo pela API)"}`);

  // ── Assinatura recorrente ─────────────────────────────────────────────────
  // Estado da assinatura mudou (autorizada, pausada, cancelada pelo cliente).
  if (type === "subscription_preapproval") {
    try {
      const sub = await getPreapproval(check.paymentId);
      const userId = String(sub.external_reference || "").split(":")[0];
      if (userId) {
        await query("update users set subscription_kind=$2 where id=$1 and mp_preapproval_id=$3",
          [userId, sub.status || "", String(sub.id)]);
        console.log(`[mp webhook] assinatura ${sub.id} do user ${userId}: ${sub.status}`);
      }
    } catch (e) { console.error("[mp webhook] preapproval:", e.message); }
    return res.json({ received: true });
  }

  // Cobrança de um ciclo da assinatura: é aqui que a renovação automática
  // libera mais um período (mesma regra do pagamento avulso: empilha e zera a cota).
  if (type === "subscription_authorized_payment") {
    try {
      const ap = await getAuthorizedPayment(check.paymentId);
      const sub = await getPreapproval(ap.preapproval_id);
      const [userId, plan, interval] = String(sub.external_reference || "").split(":");
      const paid = ["approved", "accredited", "processed"].includes(String(ap.status || ap.payment?.status || ""));
      if (userId && plan && paid) {
        const days = PERIOD_DAYS[interval] || 30;
        await query(
          `update users set plan=$2, subscription_status='active', subscription_kind='authorized', quota_anchor=now(),
             current_period_end = greatest(coalesce(current_period_end, now()), now()) + make_interval(days => $3)
           where id=$1`,
          [userId, plan, days]
        );
        console.log(`[mp webhook] renovação automática: user ${userId} -> ${plan}/${interval}`);
      } else if (userId && !paid) {
        // Cobrança falhou (cartão recusado): o MP ainda vai tentar de novo. Não
        // corta o acesso aqui — o vencimento + carência já cuidam disso sozinhos.
        console.warn(`[mp webhook] cobranca da assinatura falhou (user ${userId}): ${ap.status}`);
      }
    } catch (e) { console.error("[mp webhook] authorized_payment:", e.message); }
    return res.json({ received: true });
  }

  // Só tratamos notificações de pagamento; o resto é apenas confirmado (200).
  if (type && type !== "payment") return res.json({ received: true, ignored: type });

  const paymentId = check.paymentId;
  if (!paymentId) return res.json({ received: true });

  try {
    const pay = await getPayment(paymentId);

    // Dinheiro devolvido (estorno, contestação ou cancelamento): o acesso que
    // ESTE pagamento liberou tem que cair. Sem isso o cliente pedia o estorno e
    // seguia usando o mês inteiro — prejuízo direto. Só encerra o período se o
    // pagamento realmente tinha sido processado por nós (está em mp_payments) e
    // ainda não foi tratado, para não mexer em quem já renovou depois.
    if (["refunded", "charged_back", "cancelled"].includes(pay.status)) {
      const { rows: prev } = await query(
        "update mp_payments set status=$2 where id=$1 and status='approved' returning user_id, plan",
        [String(pay.id), pay.status]
      );
      const owner = prev[0];
      if (owner?.user_id) {
        // Encerra agora: cai na carência e depois suspende (não vira 'free').
        await query(
          `update users set current_period_end = now(), subscription_status='expired'
            where id=$1 and coalesce(role,'user') <> 'admin'`,
          [owner.user_id]
        );
        console.warn(`[mp webhook] pagamento ${pay.id} ${pay.status}: acesso do user ${owner.user_id} encerrado.`);
      }
      return res.json({ received: true, status: pay.status, revoked: !!owner });
    }

    if (pay.status !== "approved") {
      // pending (Pix aguardando), rejected, etc.: nada a liberar ainda.
      console.log(`[mp webhook] pagamento ${paymentId} com status ${pay.status} (não libera).`);
      return res.json({ received: true, status: pay.status });
    }

    // Idempotência: se este pagamento já foi processado, não libera de novo.
    const ref = String(pay.external_reference || "");
    const [userId, plan, interval] = ref.split(":");
    const dup = await query(
      "insert into mp_payments(id,user_id,plan,interval,amount,status) values($1,$2,$3,$4,$5,$6) on conflict (id) do nothing returning id",
      [String(pay.id), userId || null, plan || "", interval || "", pay.transaction_amount || 0, pay.status]
    );
    if (!dup.rows.length) return res.json({ received: true, duplicate: true });

    if (!userId || !plan || !interval) {
      console.error("[mp webhook] external_reference inválido:", ref);
      return res.json({ received: true, warning: "sem referência" });
    }

    // Defesa: o valor pago tem que bater com o preço do plano no servidor.
    const expected = PLAN_PRICES_BRL[plan]?.[interval];
    if (!expected || Math.abs(Number(pay.transaction_amount) - expected) > 0.01) {
      console.error(`[mp webhook] valor divergente: pagou ${pay.transaction_amount}, esperado ${expected} (${plan}/${interval})`);
      return res.json({ received: true, warning: "valor divergente" });
    }

    const days = PERIOD_DAYS[interval] || 30;
    // Libera o período. Renovação antecipada empilha a partir do fim atual.
    const upd = await query(
      // quota_anchor = agora: o pagamento inicia um novo ciclo de cota. O que
      // sobrou do ciclo anterior NÃO acumula (some ao renovar).
      `update users set plan=$2, subscription_status='active', quota_anchor=now(),
         current_period_end = greatest(coalesce(current_period_end, now()), now()) + make_interval(days => $3)
       where id=$1 returning current_period_end`,
      [userId, plan, days]
    );
    if (upd.rows.length) {
      console.log(`[mp webhook] acesso liberado: user ${userId} -> ${plan}/${interval} até ${upd.rows[0].current_period_end}`);
    }
    return res.json({ received: true });
  } catch (e) {
    // Pagamento inexistente (ex.: id fake da simulação): confirma com 200 para
    // não gerar reenvios. Outros erros devolvem 500 para o MP tentar de novo.
    if (e.status === 404) {
      console.log(`[mp webhook] pagamento ${paymentId} não encontrado (simulação/ignorado).`);
      return res.json({ received: true, notFound: true });
    }
    console.error("[mp webhook] erro:", e.message);
    return res.status(500).json({ error: "Falha ao processar." });
  }
});

export default r;
