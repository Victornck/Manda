-- Controle do lembrete de renovação. Guarda PARA QUAL vencimento o lembrete já
-- foi enviado. Assim: manda uma vez só por período, e quando a pessoa renova
-- (current_period_end muda), fica elegível de novo para o próximo vencimento.
alter table users add column if not exists renewal_reminded_for timestamptz;
