-- Contagem de propostas por usuario, materializada em users.proposals_count.
--
-- Relacionamento usado: proposals.user_id -> users.id (FK ja existente desde a
-- 001_init, com on delete cascade). Nenhuma tabela nova, nenhum relacionamento
-- novo, nenhuma coluna alterada fora do users.
--
-- ATENCAO: este numero NAO e a cota do plano. A cota continua vindo de
-- proposal_usage, que e append-only de proposito (apagar proposta nao devolve
-- cota). proposals_count conta as linhas VIVAS em proposals, entao ele cai
-- quando o usuario exclui uma proposta. Nunca use esta coluna para cobranca.

-- 1) Coluna. NOT NULL com default 0, entao usuario sem proposta ja nasce zerado
--    e as linhas existentes sao preenchidas sem quebrar nada.
alter table users add column if not exists proposals_count integer not null default 0;

-- 2) Nao pode ficar negativo nem por bug de trigger.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'users_proposals_count_nonneg'
      and conrelid = 'users'::regclass
  ) then
    alter table users add constraint users_proposals_count_nonneg
      check (proposals_count >= 0);
  end if;
end $$;

-- 3) Funcao de sincronismo. SECURITY DEFINER para o contador funcionar mesmo se
--    um dia houver policy de RLS em users; search_path fixo para nao aceitar
--    schema injetado. So mexe na coluna do contador, em mais nenhuma.
create or replace function sync_users_proposals_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update users set proposals_count = proposals_count + 1 where id = new.user_id;
    return new;
  elsif (tg_op = 'DELETE') then
    -- greatest(...,0) protege contra contagem negativa se algo sair do lugar.
    update users set proposals_count = greatest(proposals_count - 1, 0) where id = old.user_id;
    return old;
  elsif (tg_op = 'UPDATE') then
    -- Hoje o app nunca troca o dono de uma proposta, mas se trocar o contador
    -- acompanha em vez de dessincronizar em silencio.
    if new.user_id is distinct from old.user_id then
      update users set proposals_count = greatest(proposals_count - 1, 0) where id = old.user_id;
      update users set proposals_count = proposals_count + 1 where id = new.user_id;
    end if;
    return new;
  end if;
  return null;
end $$;

-- 4) Trigger. Nao altera colunas nem constraints de proposals: so observa.
drop trigger if exists trg_sync_users_proposals_count on proposals;
create trigger trg_sync_users_proposals_count
after insert or delete or update of user_id on proposals
for each row execute function sync_users_proposals_count();

-- 5) Backfill com a contagem REAL. Roda depois do trigger existir, entao o
--    numero ja nasce correto e continua correto daqui pra frente.
--    Usuario sem proposta fica em 0 (coalesce).
update users u
   set proposals_count = sub.n
  from (
        select u2.id, count(pr.id)::int as n
          from users u2
          left join proposals pr on pr.user_id = u2.id
         group by u2.id
       ) sub
 where sub.id = u.id
   and u.proposals_count is distinct from sub.n;

-- 6) RLS. Ja estava habilitado em users desde a 003_security; este comando e
--    idempotente e serve de garantia caso o banco tenha sido recriado fora das
--    migracoes. Nenhuma policy existente e removida ou enfraquecida, e nenhuma
--    policy nova e criada: sem policy, a anon key do Supabase nao le nada, e o
--    backend conecta como dono da tabela (ignora RLS), entao a aplicacao segue
--    funcionando igual. Criar policy aqui so AFROUXARIA o acesso.
alter table users enable row level security;
