-- CPF deixa de ficar em texto puro. Passa a: cifra AES (cpf_enc, reversível)
-- + índice cego HMAC (cpf_hash, para a regra de 1 conta por CPF).
alter table users add column if not exists cpf_enc text;
alter table users add column if not exists cpf_hash text;

-- Unicidade agora é pelo índice cego. A coluna antiga vira opcional (será
-- esvaziada no backfill que roda ao subir o servidor).
create unique index if not exists users_cpf_hash_key on users (cpf_hash);
alter table users alter column cpf drop not null;
