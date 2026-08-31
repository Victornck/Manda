-- Correcao do backfill da 019: ela ancorou em (current_period_end - 30 dias),
-- o que cai no FUTURO para quem tem plano anual (ou periodo longo). Ancora no
-- futuro quebra o calculo do ciclo e faria a cota nunca contar. Aqui trazemos
-- qualquer ancora futura para agora: o ciclo passa a valer a partir de hoje.
update users
   set quota_anchor = now()
 where quota_anchor is not null
   and quota_anchor > now();
