# Manda — Backend (API)

API REST em Node.js + Express + PostgreSQL. Autenticação por JWT, propostas
por usuário, link público de proposta e painel financeiro.

## Rodar localmente

Pré-requisito: um PostgreSQL rodando (local, Docker, Neon, Supabase, Railway…).

```bash
cd backend
cp .env.example .env        # preencha DATABASE_URL e um JWT_SECRET longo
npm install
npm run migrate             # cria as tabelas
npm run dev                 # sobe a API em http://localhost:4000
```

`GET /health` responde `{ ok: true }` quando está no ar.

## Variáveis de ambiente

| Var            | Descrição                                            |
| -------------- | ---------------------------------------------------- |
| `DATABASE_URL` | string de conexão do Postgres                        |
| `JWT_SECRET`   | segredo longo e aleatório (nunca versione)           |
| `JWT_EXPIRES`  | validade do token (ex: `7d`)                         |
| `CORS_ORIGIN`  | origem(ns) do front, separadas por vírgula           |
| `PGSSL`        | `true` se o Postgres exige SSL (Neon, Supabase…)     |
| `PORT`         | porta da API (padrão 4000)                           |

## Endpoints

Autenticação (`/api/auth`)

- `POST /register` `{ name, email, cpf, password }` → `{ token, user }`
- `POST /login` `{ email, password }` → `{ token, user }`
- `GET /me` (Bearer) → `{ user }`

Propostas (`/api/proposals`, exige Bearer)

- `GET /` — lista as suas propostas
- `POST /` — cria
- `GET /:id` — abre (só se for sua)
- `PUT /:id` — atualiza
- `PATCH /:id/status` `{ status }`
- `DELETE /:id`
- `GET /stats` — KPIs (receita do mês, em aberto, conversão) + por cliente

Público (`/api/public`, sem login)

- `GET /:publicId` — proposta somente leitura; registra visualização
- `POST /:publicId/accept` — cliente aceita
- `POST /:publicId/decline` — cliente recusa

Status possíveis: `draft`, `sent`, `viewed`, `accepted`, `declined`.

## Segurança (o que já está no código)

- Senhas com **bcrypt** (custo 12); nunca são retornadas.
- **CPF nunca sai nas respostas** e tem `UNIQUE` no banco (uma conta por CPF).
- **JWT** assinado com segredo do `.env`, com expiração.
- **Autorização por dono**: toda query de proposta filtra por `user_id`.
- SQL **sempre parametrizado** ($1, $2…), sem concatenar string (anti-injection).
- **helmet** (headers), **CORS** por allowlist, **rate limit** (mais rígido no login).
- **Validação** de entrada com `zod` (inclui teto de 20 itens).
- Link público por `public_id` curto e imprevisível; devolve só os campos que o
  cliente pode ver (sem PII do dono, sem email do cliente).
- Erros internos não vazam detalhe ao cliente.

## Atenção — LGPD (CPF)

CPF é dado pessoal sensível. Antes de produção: tenha base legal e política de
privacidade, considere criptografar em repouso, restrinja quem acessa o banco,
e nunca logue o CPF. Este código já evita expô-lo nas APIs, mas o cumprimento
da LGPD é responsabilidade do produto.

## Escalabilidade

- **Pool** de conexões (não abre conexão por request).
- **JWT stateless**: escala horizontal sem sessão em memória.
- Índices em `email`, `cpf`, `public_id` e `user_id`.
- Migrations versionadas e idempotentes.

Próximos passos quando o volume crescer: cache (Redis) para leituras públicas,
fila para envio de email, e paginação nas listas.

## Ligar o frontend

O front já tem um cliente pronto em `frontend/src/lib/api.js`. Defina
`VITE_API_URL=http://localhost:4000/api` no `.env` do front e troque as chamadas
locais (`drafts.js` / `supabase.js`) pelas do `api.js`. Guia rápido no topo do
`api.js`.
