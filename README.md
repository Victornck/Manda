<div align="center">

# Manda

**Cria. Envia. Fecha.**

Propostas comerciais com cara de agência: crie, envie por link ou pelo seu próprio Gmail, e acompanhe cada etapa até o fechamento.

![React](https://img.shields.io/badge/React-18-149ECA)
![Vite](https://img.shields.io/badge/Vite-5-646CFF)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1)
![Mercado Pago](https://img.shields.io/badge/Pagamentos-Mercado%20Pago-00B1EA)

</div>

---

## Sobre

Manda é um SaaS brasileiro para freelancers e pequenos negócios criarem orçamentos e propostas de forma rápida e profissional. O usuário monta a proposta num editor com preview ao vivo, escolhe um template, define os itens de investimento e gera um link público curto para enviar ao cliente. A partir daí, acompanha quando a proposta foi vista, aceita ou recusada, e ainda pode enviar pelo próprio Gmail e cobrar assinatura por Pix, cartão ou boleto.

## Recursos

**Propostas**
- Editor com preview ao vivo e vários templates (minimal, bold, editorial, capa, dossiê, e outros)
- Personalização: cor de destaque, gradiente, tema claro/escuro, marca d'água, logo e capa
- Itens de investimento com opção de ocultar do cliente e **reordenar arrastando** (ou pelo teclado)
- Calculadora de preço integrada
- Duplicar proposta (reaproveita uma parecida como rascunho, sem refazer do zero)
- Exportação em PDF

**Envio e acompanhamento**
- Link público curto (`/p/:id`) com rastreio de visualização, aceite e recusa
- Envio da proposta pelo **Gmail do próprio usuário** (Gmail API, escopo `gmail.send`), com limite de 1 e-mail por proposta
- **Follow-up assistido**: a Manda aponta as propostas paradas e você envia o lembrete com um clique
- Painel de clientes, notificações e painel financeiro (receita, em aberto, conversão)

**Conta e cobrança**
- Autenticação própria (JWT em cookie), login com Google e recuperação de senha por código
- Planos com cobrança via **Mercado Pago** (Pix, cartão, boleto), no modelo pagamento por período (sem cobrança recorrente automática)
- Cota mensal de propostas por plano

**Apoio ao usuário**
- Onboarding guiado, chat de ajuda e "Relatar problema" (envia direto pro suporte)
- Monitoramento de erro opcional via Sentry

## Stack

| Camada | Tecnologias |
| --- | --- |
| Frontend | React 18, Vite, JavaScript, react-router-dom, lucide-react, estilos inline com tokens em `theme.js` |
| Backend | Node.js, Express, PostgreSQL (Supabase), `pg`, zod, JWT, bcryptjs, helmet, express-rate-limit, nodemailer |
| Integrações | Gmail API (OAuth), Mercado Pago (Checkout Pro), Sentry |
| Testes | Runner nativo do Node (`node --test`), Postgres embutido, supertest |

## Estrutura

```text
Manda.ai/
├── frontend/                 App web (React + Vite)
│   ├── src/
│   │   ├── pages/            Landing, Auth, Pricing, Dashboard, PublicProposal, Terms, Privacy
│   │   ├── components/       SupportChat, ReportProblem, ErrorBoundary, LegalDoc, ...
│   │   ├── templates/        Designs das propostas
│   │   ├── lib/              api.js (cliente HTTP), drafts, notifs, support
│   │   └── theme.js          Tokens de cor, fonte e sombra
│   └── public/               Logos, favicon, ícones
│
├── backend/                  API Express
│   ├── src/
│   │   ├── routes/           auth, proposals, integrations, public, billing, webhook, feedback
│   │   ├── lib/              db, mailer, googleMail, mercadopago, pii (cifra CPF), secretbox, sentry
│   │   ├── middleware/       auth, rateLimit, error
│   │   ├── migrations/       001..016 (fonte da verdade do schema)
│   │   ├── app.js            Express configurado (sem listen) — usado nos testes
│   │   └── server.js         Sobe o servidor e os jobs
│   └── test/                 Unitários e de integração
│
├── DEPLOY.md                 Guia de deploy
└── AUDITORIA_SEGURANCA_MANDA.md   Relatório de segurança
```

## Como rodar

Pré-requisitos: Node.js 18+ e um banco PostgreSQL (o projeto usa Supabase, mas qualquer Postgres serve).

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env    # edite com seus valores (veja a tabela abaixo)
npm run migrate         # cria/atualiza o schema a partir das migrations
npm run dev             # sobe a API em http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env    # aponte VITE_API_URL para o backend
npm run dev             # sobe o app em http://localhost:5173
```

## Variáveis de ambiente

### Backend (`backend/.env`)

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | sim | String de conexão do PostgreSQL |
| `JWT_SECRET` | sim | Segredo para assinar os tokens de sessão |
| `PORT` | não | Porta da API (padrão 4000) |
| `CORS_ORIGIN` | não | Origem(ns) permitida(s) do front |
| `PGSSL` | não | `true` para conexão SSL com o banco |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | não | OAuth do Google (login e envio por Gmail) |
| `GOOGLE_OAUTH_REDIRECT` | não | URL de callback do OAuth |
| `GOOGLE_TOKEN_KEY` | não | Chave para cifrar o refresh token do Gmail |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | não | SMTP para e-mails transacionais (códigos, relatos) |
| `EMAIL_FROM` | não | Remetente dos e-mails transacionais |
| `CPF_ENC_KEY` / `CPF_INDEX_KEY` | não | Chaves para cifrar o CPF e o índice cego |
| `MP_ACCESS_TOKEN` / `MP_WEBHOOK_SECRET` | não | Credenciais do Mercado Pago |
| `BACKEND_URL` | não | URL pública do backend (usada no webhook) |
| `APP_URL` | não | URL pública do front (links e redirects) |
| `SENTRY_DSN` | não | Liga o monitoramento de erro (vazio = desligado) |

As chaves opcionais desligam sua feature com elegância quando ausentes (ex.: sem `MP_ACCESS_TOKEN`, a cobrança responde 501 e o resto do app segue normal).

### Frontend (`frontend/.env`)

| Variável | Descrição |
| --- | --- |
| `VITE_API_URL` | Base da API (ex.: `http://localhost:4000/api`) |
| `VITE_GOOGLE_CLIENT_ID` | Client ID do Google (público) |
| `VITE_SENTRY_DSN` | DSN do Sentry do front (vazio = desligado) |

## Banco de dados e migrations

O schema é **reconstruível do zero a partir das migrations** em `backend/src/migrations/` (numeradas `001` em diante). São a fonte da verdade: qualquer mudança de estrutura entra como um novo arquivo `.sql` idempotente. Para aplicar:

```bash
cd backend
npm run migrate
```

## Scripts

**Backend**

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Sobe a API com reload automático |
| `npm start` | Sobe a API em produção |
| `npm run migrate` | Aplica as migrations |
| `npm test` | Roda a suíte de testes |

**Frontend**

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Ambiente de desenvolvimento (Vite) |
| `npm run build` | Build de produção |
| `npm run preview` | Serve o build localmente |

## Testes

A suíte usa o runner nativo do Node com um **Postgres embutido** (sem Docker, sem root), roda as migrations num banco limpo e derruba tudo no fim. Não toca no banco real.

```bash
cd backend
npm test
```

Cobre os caminhos críticos: autenticação, cota não-burlável, imutabilidade de proposta enviada, idempotência do pagamento, follow-up, "Relatar problema", e as funções de segurança (cifra de CPF, assinatura do webhook, montagem de e-mail). Detalhes em `backend/test/README.md`.

## Segurança

- **CPF cifrado** em repouso (AES-256-GCM) com índice cego HMAC para busca sem expor o dado
- **Refresh token do Gmail** cifrado em repouso
- **RLS deny-all** em todas as tabelas (o backend conecta como dono; nenhum acesso via chave anônima)
- **Rate limiting** por superfície de ataque (login, cadastro, envio de e-mail, cobrança, etc.)
- **Cota mensal append-only**: não dá para burlar apagando e recriando propostas
- **Webhook idempotente**: o mesmo pagamento nunca libera plano duas vezes; a confiança vem de um re-fetch autenticado, não só da assinatura
- **1 e-mail por proposta** garantido por índice único (não há como spamar o cliente)

Relatório completo em `AUDITORIA_SEGURANCA_MANDA.md`.

## Integrações

- **Gmail API** (`gmail.send`): envio da proposta pelo e-mail do próprio usuário. Em produção exige a verificação OAuth do Google (escopo sensível, sem necessidade de avaliação CASA)
- **Mercado Pago** (Checkout Pro): Pix, cartão e boleto, no modelo pagamento por período
- **Sentry**: monitoramento de erro no backend e no frontend, ligado apenas quando há DSN

## Deploy

Passo a passo em [`DEPLOY.md`](./DEPLOY.md). Em produção, o backend Express serve o build do frontend e expõe a URL do webhook no mesmo domínio.

## Legal

O app inclui Termos de Uso e Política de Privacidade (rotas `/termos` e `/privacidade`), alinhados à LGPD, com regra de reembolso de 7 dias conforme o Código de Defesa do Consumidor (Art. 49).

---

<div align="center">
<sub>Manda · propostas que fecham negócio</sub>
</div>
