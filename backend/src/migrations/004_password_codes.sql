-- Códigos de uso único para "esqueci a senha" e troca de senha no painel.
-- O código de 6 dígitos NUNCA é guardado em texto puro — só o hash (HMAC).
create table if not exists password_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  purpose text not null,                 -- 'reset' (esqueci) | 'change' (painel)
  code_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  attempts int not null default 0,       -- tentativas de verificação (anti força-bruta)
  created_at timestamptz default now()
);

-- Converge tabelas já criadas manualmente (a coluna pode não existir).
alter table password_codes add column if not exists attempts int not null default 0;

create index if not exists idx_password_codes_lookup
  on password_codes (user_id, purpose, created_at desc);

-- Fecha para a REST API pública do Supabase (o backend usa o papel dono e ignora RLS).
alter table password_codes enable row level security;
