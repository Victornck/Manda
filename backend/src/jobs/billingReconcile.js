import { query } from "../db.js";
import { sendRenewalReminders } from "./renewalReminder.js";

// Expiração de acesso (rede de segurança do modelo por período).
// Cada pagamento aprovado no Mercado Pago grava users.current_period_end (a data
// até quando o acesso vale). Aqui, todo dia às 08:00 (Brasília), quem passou
// dessa data volta para 'free' — o que bloqueia criar/enviar propostas e faz o
// app oferecer a renovação. Puramente por data: não depende de chamar o MP.
//
// O job é idempotente (rodar duas vezes não muda nada) e roda também ao subir o
// servidor, cobrindo a janela caso ele estivesse fora do ar às 8h.

const TZ = "America/Sao_Paulo";
const RUN_HOUR = 8;

function spNow() {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ, hour12: false, hour: "numeric", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value || "";
  return { hour: parseInt(get("hour"), 10) % 24, date: `${get("year")}-${get("month")}-${get("day")}` };
}

export async function reconcileBilling() {
  // Só mexe em quem tem plano pago, não é admin, e cujo acesso JÁ VENCEU.
  // current_period_end nulo (edge/legado) é deixado em paz de propósito.
  const { rows } = await query(
    `update users
        set plan='free', subscription_status='expired'
      where plan <> 'free'
        and coalesce(role,'user') <> 'admin'
        and current_period_end is not null
        and current_period_end < now()
      returning id, email`
  );
  if (rows.length) {
    for (const u of rows) console.log(`[billing] acesso expirado (renovação pendente): ${u.email}`);
  }
  console.log(`[billing] reconciliação: ${rows.length} conta(s) expirada(s).`);
  return { downgraded: rows.length };
}

// Rotina diária: primeiro avisa quem está perto de vencer, depois expira quem
// já passou. A ordem importa: lembrar antes de bloquear.
async function runDaily() {
  await sendRenewalReminders().catch((e) => console.error("[renewal] falhou:", e.message));
  await reconcileBilling().catch((e) => console.error("[billing] reconciliação falhou:", e.message));
}

let lastRunDate = null;
export function startBillingReconciler() {
  const tick = () => {
    const { hour, date } = spNow();
    if (hour === RUN_HOUR && lastRunDate !== date) {
      lastRunDate = date;
      runDaily();
    }
  };
  setTimeout(() => { runDaily(); }, 10_000);
  setInterval(tick, 10 * 60_000);
  console.log("[billing] expiração + lembrete de renovação agendados para 08:00 (America/Sao_Paulo).");
}
