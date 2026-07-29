-- Follow-up assistido: guarda quando o dono cutucou o cliente pela última vez.
-- Serve para dar um cooldown (não repetir lembrete sem parar) e para a proposta
-- sumir da lista de "precisa de follow-up" depois de lembrada. Uma coluna só,
-- idempotente (no-op se já existir). Nada é enviado sozinho: o dono clica.
alter table proposals add column if not exists reminded_at timestamptz;
