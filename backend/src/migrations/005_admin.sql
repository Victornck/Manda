-- Papel do usuário. 'admin' tem acesso total: sem cota, todos os templates,
-- e o reconciliador de cobrança NUNCA mexe nele. Só muda direto no banco —
-- nenhuma rota da API escreve nesta coluna.
alter table users add column if not exists role text not null default 'user';
