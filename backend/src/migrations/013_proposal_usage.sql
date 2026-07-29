-- Cota mensal APPEND-ONLY: cada proposta concluída insere uma linha aqui, e nada
-- é removido ao excluir a proposta. É a fonte da verdade da cota (não dá para
-- burlar apagando e recriando). Esta tabela já existia no banco, mas não tinha
-- arquivo de migration; agora tem, para o schema ser reconstruível do zero.
create table if not exists proposal_usage (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_proposal_usage_user on proposal_usage(user_id, created_at);

-- Fecha para a API anon do Supabase (o backend conecta como dono e ignora RLS).
alter table proposal_usage enable row level security;
