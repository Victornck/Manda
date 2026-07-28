# Pagamentos com Mercado Pago

O código já está pronto (checkout, webhook, expiração por período e a UI). Falta
só configurar sua conta do Mercado Pago e colar duas chaves no `.env`.

## Como funciona (o modelo escolhido)

Pagamento **por período**, e o usuário escolhe a forma de pagar (Pix, cartão ou
boleto) na própria tela do Mercado Pago:

- Mensal: cada pagamento libera 30 dias.
- Anual: cada pagamento libera 365 dias.
- Não há cobrança automática. Perto do fim, a pessoa renova. Quem não renova
  volta para `free` (bloqueia criar/enviar propostas) no dia seguinte, às 8h.

No Pix o acesso é liberado quando o pagamento é **confirmado** (o Mercado Pago
avisa o backend pelo webhook), não no instante em que o QR é gerado.

## 1. Criar a aplicação e pegar o Access Token

1. Acesse https://www.mercadopago.com.br/developers/panel e crie uma aplicação
   (tipo "Pagamentos online" / Checkout Pro).
2. Em **Credenciais**:
   - Para testar: use as **de teste** (Access Token começa com `TEST-...`).
   - Para valer de verdade: use as **de produção** (`APP_USR-...`).
3. Cole em `MP_ACCESS_TOKEN` no `backend/.env`.

## 2. Configurar o Webhook (essencial)

1. No painel da aplicação, vá em **Webhooks / Notificações**.
2. URL: `{BACKEND_URL}/api/webhooks/mercadopago`
   (ex.: `https://seu-backend.com/api/webhooks/mercadopago`).
3. Marque o evento **Pagamentos** (`payment`).
4. Copie a **Chave secreta** que o MP mostra e cole em `MP_WEBHOOK_SECRET`.

O webhook valida essa assinatura: sem ela, ninguém consegue forjar um "paguei".

## 3. BACKEND_URL público

O Mercado Pago precisa **alcançar** seu backend para avisar do pagamento. Em
produção é a URL real. Em desenvolvimento com `localhost`, use um túnel:

```
ngrok http 4000
```

Pegue a URL `https://...ngrok...` e coloque em `BACKEND_URL` (e é essa mesma URL
+ `/api/webhooks/mercadopago` que vai no webhook do MP). Reinicie o backend.

## 4. Testar

1. Com credenciais de **teste**, o Mercado Pago exige um **comprador de teste**
   (crie em Suas integrações > Contas de teste). Faça login no checkout com essa
   conta de teste, não com a sua real.
2. No app: Preços > assine um plano. Você vai pro Mercado Pago, escolhe Pix,
   cartão ou boleto e paga. Cartões de teste atuais (Brasil), para aprovar use
   nome `APRO` e CPF `12345678909`:
   - Visa: 4235 6477 2802 5682 · CVV 123 · 11/30
   - Mastercard: 5480 8328 0103 3311 · CVV 123 · 11/30
   Pix de teste só aparece se a conta que recebe tiver uma chave Pix cadastrada.
3. Ao confirmar, o webhook libera o plano e o acesso aparece em Configurações.

## Segurança (já implementado)

- O **valor** vem sempre do servidor (`PLAN_PRICES_BRL`), o cliente nunca escolhe
  quanto paga. O webhook ainda confere se o valor pago bate com o do plano.
- A liberação do plano só acontece por webhook com **assinatura válida**, e o
  backend **rebusca o pagamento** no Mercado Pago para confirmar o status real.
- Idempotência: o mesmo pagamento (PK em `mp_payments`) nunca libera período em
  dobro, mesmo se a notificação chegar repetida.
- Expiração diária por data: acesso vencido volta para `free` automaticamente.

## Observação sobre o Stripe

O código do Stripe continua no projeto, mas **desativado** (nada mais o chama). O
app agora usa só o Mercado Pago. Se um dia quiser, dá para remover os arquivos
`lib/stripe.js` e as variáveis `STRIPE_*` do `.env`.
