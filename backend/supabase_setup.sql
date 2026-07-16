-- ============================================================
-- Manda — setup completo do banco (cole no SQL Editor do Supabase e rode)
-- Cria as tabelas, campos de assinatura e a trava de segurança (RLS).
-- ============================================================

create extension if not exists pgcrypto;

-- Usuários. cpf e email são únicos (uma conta por CPF, garantido pelo banco).
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  cpf text not null unique,          -- dado sensível (LGPD): nunca retornado nas APIs
  password_hash text not null,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

create table if not exists proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  public_id text not null unique,    -- id curto e não sequencial para o link público
  client text not null default '',
  company text not null default '',
  client_email text not null default '',
  title text not null default '',
  scope text not null default '',
  items jsonb not null default '[]',
  start_date text not null default '',
  end_date text not null default '',
  payment text not null default '',
  revisions text not null default '',
  validity text not null default '',
  bio text not null default '',
  accent text not null default '#D97757',
  template text not null default 'minimal',
  status text not null default 'draft' check (status in ('draft','sent','viewed','accepted','declined')),
  value numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_proposals_user on proposals(user_id, created_at desc);
create index if not exists idx_proposals_public on proposals(public_id);

-- Eventos: registra quando o cliente abriu / aceitou / recusou a proposta.
create table if not exists proposal_events (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals(id) on delete cascade,
  type text not null check (type in ('viewed','accepted','declined')),
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_events_proposal on proposal_events(proposal_id, created_at desc);

-- Campos de assinatura (Stripe) no usuário.
alter table users add column if not exists stripe_customer_id text;
alter table users add column if not exists stripe_subscription_id text;
alter table users add column if not exists subscription_status text;
alter table users add column if not exists current_period_end timestamptz;

-- Idempotência de webhooks: cada evento do Stripe processado uma única vez.
create table if not exists billing_events (
  id text primary key,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- SEGURANÇA: liga RLS sem políticas em todas as tabelas.
-- Isso BLOQUEIA leitura via a REST API pública do Supabase (anon key).
-- O backend Node conecta como 'postgres' (dono) e ignora o RLS, então
-- a aplicação continua funcionando 100%.
-- ------------------------------------------------------------
alter table users enable row level security;
alter table proposals enable row level security;
alter table proposal_events enable row level security;
alter table billing_events enable row level security;
