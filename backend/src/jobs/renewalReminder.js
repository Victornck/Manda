import { query } from "../db.js";
import { env } from "../env.js";
import { PLAN_LABELS } from "../lib/plans.js";
import { sendMail, renewalEmailHtml, renewalEmailText } from "../lib/mailer.js";

// Lembrete de renovação: avisa por e-mail quem está a até 3 dias de perder o
// acesso (current_period_end). Idempotente: grava renewal_reminded_for com o
// vencimento avisado, então manda uma vez por período. Quem renova (vencimento
// muda) fica elegível de novo para o próximo. Roda junto da expiração diária.

const REMIND_DAYS = 3;

export async function sendRenewalReminders() {
  const { rows } = await query(
    `select id, name, email, plan, current_period_end
       from users
      where plan <> 'free'
        and coalesce(role,'user') <> 'admin'
        and current_period_end is not null
        and current_period_end > now()
        and current_period_end <= now() + make_interval(days => $1)
        and (renewal_reminded_for is null or renewal_reminded_for <> current_period_end)`,
    [REMIND_DAYS]
  );

  let sent = 0;
  for (const u of rows) {
    const end = new Date(u.current_period_end);
    const daysLeft = Math.max(1, Math.ceil((end.getTime() - Date.now()) / 86_400_000));
    const dateStr = end.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const planLabel = PLAN_LABELS[u.plan] || u.plan;
    const url = `${env.APP_URL}/precos`;
    const common = { name: u.name, planLabel, dateStr, daysLeft, url };
    try {
      await sendMail({
        to: u.email,
        subject: `Seu acesso ao Manda vence ${daysLeft === 1 ? "amanhã" : `em ${daysLeft} dias`}`,
        html: renewalEmailHtml(common),
        text: renewalEmailText(common),
      });
      // Só marca como avisado se o envio deu certo (senão tenta de novo amanhã).
      await query("update users set renewal_reminded_for=$2 where id=$1", [u.id, u.current_period_end]);
      sent++;
    } catch (e) {
      console.error(`[renewal] falha ao avisar ${u.email}: ${e.message}`);
    }
  }
  if (rows.length) console.log(`[renewal] lembretes: ${sent}/${rows.length} enviado(s).`);
  return { candidates: rows.length, sent };
}
