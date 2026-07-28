-- "Apenas 1 e-mail por proposta": garante no BANCO que só existe um evento
-- 'emailed' por proposta. Mesmo com cliques simultâneos (corrida), o segundo
-- insert falha na constraint única, então nunca sai um segundo e-mail.
create unique index if not exists uniq_emailed_per_proposal
  on proposal_events (proposal_id)
  where type = 'emailed';
