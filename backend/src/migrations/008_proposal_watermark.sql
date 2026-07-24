-- Marca d'água do template "Grande": "" (inicial automática), "off" (nenhuma)
-- ou uma letra específica.
alter table proposals add column if not exists watermark text not null default '';
