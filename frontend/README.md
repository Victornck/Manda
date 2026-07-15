# Manda — app React

Projeto React (Vite) gerado a partir do design do Manda no Claude Design.
As 5 telas (`Landing`, `Pricing`, `Auth`, `App`/Dashboard e o shell de navegação)
viraram componentes de verdade, com tokens de tema centralizados e ganchos
prontos pra ligar no Supabase.

## Rodar localmente

```bash
npm install
npm run dev       # abre em http://localhost:5173
```

## Build de produção

```bash
npm run build     # gera /dist
npm run preview   # serve o /dist localmente
```

Deploy: suba a pasta na Vercel/Netlify (framework detectado automaticamente,
output `dist`).

## Rotas

| URL            | Tela                          |
| -------------- | ----------------------------- |
| `/`            | Landing                       |
| `/precos`      | Pricing                       |
| `/entrar`      | Login                         |
| `/criar-conta` | Cadastro                      |
| `/app`         | Dashboard (lista + editor)    |

## Estrutura

```
src/
  theme.js               tokens: cor, fonte, sombra, helpers (brl, initials)
  lib/supabase.js        cliente Supabase + camada de dados (mock enquanto vazio)
  components/
    MarketingLayout.jsx  nav + footer das paginas publicas
  pages/
    Landing.jsx  Pricing.jsx  Auth.jsx  Dashboard.jsx
```

## Ligar no Supabase

1. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY` (painel do Supabase -> Settings -> API).
2. Rode o SQL de criacao da tabela `proposals` comentado no topo de
   `src/lib/supabase.js`.
3. Enquanto o `.env` nao existir, o app roda com dados de exemplo. Nada quebra.

## O que ainda e mock (de proposito)

- Login/cadastro chamam o Supabase se configurado; sem `.env`, so navegam pro app.
- As propostas do Dashboard vem de `SAMPLE_ROWS` ate a tabela existir.
- Botoes de assinar plano chamam `go("signup")` — plugue seu checkout ali.
