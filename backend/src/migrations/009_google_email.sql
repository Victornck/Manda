-- Envio de propostas pelo próprio Gmail do usuário (Gmail API, escopo gmail.send).
-- Guarda o refresh_token CRIPTOGRAFADO (AES-256-GCM, ver lib/secretbox.js). O
-- access_token é só cache de curta duração; o refresh_token é o que importa.
-- Uma conexão de Gmail por usuário (PK em user_id).
create table if not exists google_email_accounts (
  user_id            uuid primary key references users(id) on delete cascade,
  email              text not null,
  refresh_token_enc  text not null,
  access_token       text,
  access_expires_at  timestamptz,
  scope              text not null default '',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Mesma postura das demais tabelas sensíveis: fecha para a API anon do Supabase.
-- O backend conecta como dono (postgres) e ignora RLS, então segue funcionando.
alter table google_email_accounts enable row level security;

-- Passa a registrar também o envio por e-mail no histórico de eventos da proposta.
-- (As notificações do painel continuam lendo só viewed/accepted/declined.)
alter table proposal_events drop constraint if exists proposal_events_type_check;
alter table proposal_events add constraint proposal_events_type_check
  check (type in ('viewed','accepted','declined','emailed'));
