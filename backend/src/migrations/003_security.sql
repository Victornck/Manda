-- Fecha as tabelas para a API automática (anon) do Supabase.
-- O backend Node conecta como o papel 'postgres' (dono das tabelas) e IGNORA o RLS,
-- então continua funcionando normalmente; mas ninguém consegue ler esses dados
-- pela REST API pública do Supabase usando a anon key.
alter table users enable row level security;
alter table proposals enable row level security;
alter table proposal_events enable row level security;
alter table billing_events enable row level security;
