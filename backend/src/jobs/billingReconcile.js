import { stripe } from "../lib/stripe.js";
import { query } from "../db.js";

// Reconciliação diária de pagamento (rede de segurança dos webhooks).
// Todos os dias às 08:00 (horário de Brasília), confere NO STRIPE se cada
// conta com plano pago continua com assinatura ativa. Não pagou / cancelou /
// assinatura sumiu → plan vira 'free', o que bloqueia criar e enviar
// propostas e faz o app oferecer os planos para assinar de novo.
//
// Por que além do webhook: se o servidor estiver fora do ar no instante do
// evento do Stripe, o downgrade se perderia. Aqui, no máximo no dia seguinte
// às 8h a conta inadimplente é bloqueada. O job é idempotente: rodar duas
// vezes não muda nada.

const TZ = "America/Sao_Paulo";
const RUN_HOUR = 8;

// Hora/data atuais no fuso de Brasília, independente do fuso do servidor.
function spNow() {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ, hour12: false, hour: "numeric", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value || "";
  return { hour: parseInt(get("hour"), 10) % 24, date: `${get("year")}-${get("month")}-${get("day")}` };
}

export async function reconcileBilling() {
  if (!stripe) return { skipped: "Stripe não configurado" };
  const { rows } = await query(
    "select id, email, plan, stripe_subscription_id from users where plan <> 'free' and coalesce(role,'user') <> 'admin'"
  );
  let downgraded = 0;
  for (const u of rows) {
    let ok = false;
    if (u.stripe_subscription_id) {
      try {
        const sub = await stripe.subscriptions.retrieve(u.stripe_subscription_id);
        if (["active", "trialing"].includes(sub.status)) {
          ok = true;
          await query(
            "update users set subscription_status=$2, current_period_end=to_timestamp($3) where id=$1",
            [u.id, sub.status, sub.current_period_end]
          );
        } else if (sub.status === "past_due") {
          // O Stripe ainda está RETENTANDO a cobrança. Período de graça:
          // só bloqueia quando ele desistir (vira canceled/unpaid).
          ok = true;
          await query("update users set subscription_status='past_due' where id=$1", [u.id]);
        }
        // canceled / unpaid / incomplete_expired → ok = false → bloqueia.
      } catch (e) {
        const notFound = e?.statusCode === 404 || e?.raw?.statusCode === 404 || e?.code === "resource_missing";
        if (!notFound) {
          // Erro de rede/Stripe: NÃO pune o usuário; tenta de novo amanhã.
          console.error(`[billing] erro ao consultar ${u.email}: ${e.message}`);
          continue;
        }
        // Assinatura não existe mais no Stripe → sem pagamento → bloqueia.
      }
    }
    // Plano pago sem assinatura no Stripe (ou assinatura morta): bloqueia.
    if (!ok) {
      await query(
        "update users set plan='free', subscription_status=coalesce(nullif(subscription_status,''),'canceled') where id=$1",
        [u.id]
      );
      downgraded++;
      console.log(`[billing] acesso bloqueado por falta de pagamento: ${u.email}`);
    }
  }
  console.log(`[billing] reconciliação: ${rows.length} conta(s) paga(s) verificada(s), ${downgraded} bloqueada(s).`);
  return { checked: rows.length, downgraded };
}

// Agendador: confere a cada 10 min; dispara uma vez por dia às 08:00 de
// Brasília. Também roda uma vez ao SUBIR o servidor (cobre a janela perdida
// se ele estava fora do ar às 8h).
let lastRunDate = null;
export function startBillingReconciler() {
  if (!stripe) { console.log("[billing] reconciliador desativado (sem STRIPE_SECRET_KEY)."); return; }
  const tick = () => {
    const { hour, date } = spNow();
    if (hour === RUN_HOUR && lastRunDate !== date) {
      lastRunDate = date;
      reconcileBilling().catch((e) => console.error("[billing] reconciliação falhou:", e.message));
    }
  };
  setTimeout(() => {
    reconcileBilling().catch((e) => console.error("[billing] reconciliação inicial falhou:", e.message));
  }, 10_000); // 10s após o boot: dá tempo do banco conectar
  setInterval(tick, 10 * 60_000);
  console.log("[billing] reconciliador diário agendado para 08:00 (America/Sao_Paulo).");
}
