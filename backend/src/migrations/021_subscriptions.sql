-- Assinatura recorrente (cobranca automatica pelo Mercado Pago). Convive com o
-- pagamento avulso: quem paga avulso simplesmente nao tem preapproval.
alter table users add column if not exists mp_preapproval_id text;
-- Estado da assinatura no MP: pending, authorized, paused, cancelled.
alter table users add column if not exists subscription_kind text;

create index if not exists users_mp_preapproval_idx on users (mp_preapproval_id);
