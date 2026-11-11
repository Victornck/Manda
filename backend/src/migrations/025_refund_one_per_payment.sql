-- Um pedido de reembolso por pagamento.
--
-- A regra ja e conferida no codigo (routes/billing.js, refundEligibility), mas
-- conferir-e-depois-gravar deixa uma janela: dois cliques simultaneos passam
-- os dois pela conferencia. O indice unico fecha essa janela no banco - o
-- segundo insert falha e a API responde 409.
--
-- Parcial (payment_id is not null) porque pedidos antigos, anteriores a
-- validacao de elegibilidade, podem ter ficado sem pagamento associado.
--
-- So cria o indice se nao houver duplicata ja gravada: sem essa guarda uma
-- unica linha repetida impediria a migracao (e o deploy) de rodar.
do $$
begin
  if not exists (
    select 1 from refund_requests
     where payment_id is not null
     group by payment_id having count(*) > 1
  ) then
    create unique index if not exists uniq_refund_per_payment
      on refund_requests(payment_id) where payment_id is not null;
  else
    raise notice 'refund_requests tem pagamentos repetidos: indice unico nao criado.';
  end if;
end $$;
