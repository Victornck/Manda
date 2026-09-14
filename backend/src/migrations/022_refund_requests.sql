-- Pedidos de reembolso feitos pelo proprio usuario, dentro do app.
--
-- Por que existe: o Decreto 7.962/2013, art. 5, par. 1, diz que o direito de
-- arrependimento tem que poder ser exercido "pela mesma ferramenta utilizada
-- para a contratacao". Como a pessoa assina dentro do app, ela tem que poder
-- pedir o reembolso dentro do app tambem (nao basta mandar e-mail pro suporte).
--
-- O registro fica gravado porque o mesmo decreto exige confirmacao imediata do
-- recebimento (art. 5, par. 4) e resposta em ate 5 dias (art. 4, par. unico).
-- Sem a data do pedido gravada, nao ha como provar que o prazo foi cumprido.
create table if not exists refund_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references users(id) on delete set null,
  payment_id    text,                      -- id do pagamento no Mercado Pago
  reason        text not null default '',
  message       text not null default '',
  plan          text not null default '',
  amount        numeric not null default 0,
  paid_at       timestamptz,               -- quando o pagamento foi aprovado
  within_regret boolean not null default false, -- dentro dos 7 dias do art. 49 do CDC
  status        text not null default 'aberto',  -- aberto | resolvido | recusado
  created_at    timestamptz not null default now()
);

create index if not exists idx_refund_requests_user on refund_requests(user_id, created_at desc);

-- Fecha para a API anon do Supabase (o backend conecta como dono e ignora RLS).
alter table refund_requests enable row level security;
