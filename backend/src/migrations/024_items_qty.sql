-- Coluna "Quantidade" nos itens da proposta — opcional, por proposta.
--
-- O QUE MUDA NO BANCO: uma coluna booleana em proposals. So isso.
--
-- A quantidade de cada item NAO precisa de coluna: proposals.items ja e jsonb
-- (001_init), entao cada item passa a poder carregar um campo `qty` junto de
-- `desc`, `value` e `hidden`. Item sem `qty` vale 1 — e e exatamente o caso de
-- toda proposta que ja existe, que por isso continua somando o mesmo total.
--
-- Por que a chave fica em coluna e nao dentro do jsonb: ela e um atributo da
-- PROPOSTA (mostrar ou nao a coluna), nao de um item. Mesmo tratamento que
-- `gradient` ja recebe desde a 001.
--
-- DEFAULT FALSE e o ponto inteiro da migracao: quem nunca ativou a feature nao
-- ve diferenca nenhuma, nem na tela nem no PDF nem no total.
alter table proposals add column if not exists show_qty boolean not null default false;

-- Nada de backfill: false ja e o valor certo para todas as linhas existentes.
