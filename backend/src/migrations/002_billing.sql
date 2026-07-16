-- Campos de assinatura no usuário. O `plan` já existe (001); aqui vem o resto.
alter table users add column if not exists stripe_customer_id text;
alter table users add column if not exists stripe_subscription_id text;
alter table users add column if not exists subscription_status text;
alter table users add column if not exists current_period_end timestamptz;

-- Idempotência de webhooks: cada evento do Stripe é processado uma única vez.
create table if not exists billing_events (
  id text primary key,
  created_at timestamptz not null default now()
);
