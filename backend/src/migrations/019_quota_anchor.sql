-- Ancora do ciclo de cobranca: data do ultimo pagamento aprovado. A cota mensal
-- passa a contar a partir do "aniversario" dessa data (ex.: assinou dia 20, a
-- cota vira todo dia 20), em vez do dia 1o do calendario. Assim a sobra nao
-- vira credito nem o cliente ganha cota dobrada quando o mes vira no meio do
-- ciclo pago. Nulo (contas antigas/gratis) mantem o comportamento anterior.
alter table users add column if not exists quota_anchor timestamptz;

-- Contas que ja pagam: ancora no inicio do periodo atual, para nao zerar nem
-- duplicar a cota de quem esta no meio de um ciclo na hora do deploy.
-- least(..., now()) protege planos anuais: sem isso a ancora cairia no futuro
-- (period_end - 30 dias) e o ciclo nunca fecharia.
update users
   set quota_anchor = least(current_period_end - interval '30 days', now())
 where quota_anchor is null
   and plan <> 'free'
   and current_period_end is not null;
