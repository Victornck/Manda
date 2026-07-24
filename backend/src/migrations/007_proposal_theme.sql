-- Tema de fundo do template (claro / creme / escuro). Padrão: claro.
alter table proposals add column if not exists theme text not null default 'claro';
