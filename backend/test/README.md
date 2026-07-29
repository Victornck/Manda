# Testes automatizados (backend)

Cobrem os caminhos críticos: autenticação, cota não-burlável, bloqueio de plano,
imutabilidade de proposta concluída, idempotência do pagamento, e as funções de
segurança (CPF, cifra, assinatura do webhook, montagem de e-mail).

## Como rodar

```
cd backend
npm install      # instala supertest e o postgres embutido (só na 1ª vez)
npm test
```

O `npm test` sobe um **Postgres real embutido** (via `embedded-postgres`, sem
Docker e sem root), roda as migrations num banco limpo, executa tudo e derruba o
banco no fim. Não toca no seu banco de verdade (usa o `test/.env.test`, que
aponta para `localhost:54329`).

Rodar um arquivo só:
```
node --env-file=test/.env.test --test test/unit/plans.test.js
```

## O que é testado

Unitários (sem banco), em `test/unit/`:
- `cpf` — validação de CPF (dígitos verificadores, casos inválidos).
- `crypto` — cifra do CPF e do refresh_token (roundtrip + rejeição de adulteração).
- `mercadopago` — validação da assinatura do webhook (aceita a legítima, rejeita a forjada).
- `googleMail` — montagem do MIME do e-mail (From/To/Subject codificado, multipart).
- `plans` — regras de plano (templates permitidos, hierarquia, limites de cota, preços).
- `sentry` — monitoramento fica desligado (no-op) sem DSN, sem quebrar nem exigir o pacote.

Integração (com banco), em `test/integration/`:
- `auth` — registro, login (senha certa/errada), 1 conta por CPF, `/me` exige token.
- `quota` — free não cria; Básico cria até 5; a cota é APPEND-ONLY (apagar não reabre vaga).
- `plan-gating` — template de plano superior é bloqueado; proposta concluída é imutável (409); um usuário não acessa proposta de outro (404).
- `idempotency` — o mesmo pagamento do Mercado Pago nunca libera plano duas vezes (PK em `mp_payments`).
- `feedback` — "Relatar problema": exige login, valida categoria/mensagem, responde 201.
- `follow-up` — lista propostas paradas (enviadas há dias, em aberto) e as guardas do lembrete: rascunho (409), sem e-mail do cliente (400), cooldown (429), sem Gmail conectado (409 needsConnect).

## Estrutura

- `test/setup.js` — sobe o Postgres embutido, roda migrations, limpa as tabelas antes de cada teste. Carregado via `--import`.
- `test/data.js` — helpers puros (gera CPF válido, corpo de proposta).
- `test/helpers.js` — cliente HTTP (supertest) + criar usuário + dar plano.
- `test/.env.test` — ambiente de teste (valores fictícios; nada real).

## Observação

O runner é o nativo do Node (`node --test`), sem Jest/Vitest. O app foi separado
em `src/app.js` (Express configurado) e `src/server.js` (sobe o listen + jobs),
para os testes falarem com o app sem abrir porta nem rodar os cron.
