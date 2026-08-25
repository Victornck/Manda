-- Enquadramento da capa: posição do background ("x,y" em %, ex.: "50,30").
-- Vazio/null = centralizado (comportamento antigo, compatível com propostas
-- que ainda não têm posicionamento).
alter table proposals add column if not exists cover_pos text;
