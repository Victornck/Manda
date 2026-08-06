-- Múltiplas moedas. Cada usuário tem uma moeda padrão da conta e cada proposta
-- guarda a moeda em que foi emitida. Tudo que já existe vira BRL (default), então
-- nada quebra: as propostas antigas continuam em reais.
alter table users     add column if not exists currency text not null default 'BRL';
alter table proposals add column if not exists currency text not null default 'BRL';

-- Cache das cotações: evita bater na API a cada request e dá fallback se ela cair.
-- Uma linha por moeda-base; `rates` é o mapa {MOEDA: fator} e `fetched_at` marca
-- quando foi buscado (para saber se está velho).
create table if not exists exchange_rates (
  base       text primary key,
  rates      jsonb       not null default '{}'::jsonb,
  fetched_at timestamptz not null default now()
);

-- RLS ligado, SEM política: a API pública (anon) do Supabase fica sem acesso a
-- esta tabela. O backend conecta como dono do banco e ignora RLS, então segue
-- lendo/gravando normalmente. Sem isso, a tabela ficaria aberta na API pública.
alter table exchange_rates enable row level security;
