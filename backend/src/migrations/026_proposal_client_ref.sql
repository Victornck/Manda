-- Chave de idempotencia da CRIACAO de rascunho.
--
-- O editor cria o rascunho no servidor sozinho (salvamento automatico). Se a
-- resposta dessa primeira gravacao se perde - rede caiu, a pessoa apertou F5
-- com a requisicao no ar - o navegador nao sabe que o rascunho ja existe e
-- manda criar de novo. Sem uma chave, cada tentativa viraria um rascunho
-- duplicado.
--
-- client_ref e o id provisorio que o navegador da a proposta antes de ela
-- existir no servidor (ex.: d_mwaw00zk89r73). Repetir a criacao com a mesma
-- chave atualiza o rascunho que ja existe em vez de criar outro.
--
-- Unico por usuario e parcial: propostas antigas (sem chave) nao sao afetadas.
alter table proposals add column if not exists client_ref text;

create unique index if not exists uniq_proposals_client_ref
  on proposals(user_id, client_ref) where client_ref is not null;
