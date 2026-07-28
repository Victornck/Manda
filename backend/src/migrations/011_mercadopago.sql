-- Pagamentos do Mercado Pago. A PK é o id do pagamento no MP, o que também dá
-- idempotência: a mesma notificação processada duas vezes não libera período em
-- dobro (insert com on conflict do nothing).
create table if not exists mp_payments (
  id           text primary key,          -- id do pagamento no Mercado Pago
  user_id      uuid references users(id) on delete set null,
  plan         text not null default '',
  interval     text not null default '',  -- 'month' | 'year'
  amount       numeric not null default 0,
  status       text not null default '',  -- approved | pending | rejected ...
  created_at   timestamptz not null default now()
);

create index if not exists idx_mp_payments_user on mp_payments(user_id, created_at desc);

-- Fecha para a API anon do Supabase (o backend conecta como dono e ignora RLS).
alter table mp_payments enable row level security;
