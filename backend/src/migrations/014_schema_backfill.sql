-- Backfill de colunas que existiam no banco (Supabase) mas não tinham arquivo de
-- migration (foram adicionadas direto no painel). Com isto, o schema volta a ser
-- reconstruível do zero a partir das migrations. Tudo com "if not exists", então
-- no banco atual é no-op e num banco novo cria certinho.

-- Login com Google
alter table users add column if not exists google_id text;

-- Aparência da proposta (2ª cor do gradiente, gradiente on/off, logo e capa)
alter table proposals add column if not exists accent2 text default '#6C48B0';
alter table proposals add column if not exists gradient boolean default false;
alter table proposals add column if not exists logo text default '';
alter table proposals add column if not exists cover text default '';
