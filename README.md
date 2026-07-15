# Manda

Crie propostas profissionais, envie por link e acompanhe cada etapa até o fechamento.

## Estrutura

```text
Manda.ai/
├── frontend/    App web (React + Vite)
└── backend/     Camada de servidor — ainda não implementada
```

## Frontend

Stack real, hoje:

- Vite + React 18
- JavaScript (sem TypeScript)
- Roteamento com react-router-dom
- Estilo via tokens de tema em `src/theme.js` (estilos inline, sem Tailwind)
- Ícones com lucide-react
- Cliente Supabase preparado (`src/lib/supabase.js`), ainda sem backend ligado
- Rascunhos salvos localmente no navegador (`src/lib/drafts.js`)

Rodar:

```bash
cd frontend
npm install
npm run dev
```

Telas: Landing, Preços, Login/Cadastro e o app (`/app`) com lista de propostas,
editor com preview ao vivo, conclusão com animação e compartilhamento de link.

## Backend

Vazio por enquanto. Será onde entra autenticação real, banco (Supabase) e envio
de propostas. Enquanto não existe, o app funciona com estados vazios e rascunhos
locais, sem dados falsos.

## Observação sobre a stack

Este projeto nasceu de um protótipo no Claude Design e foi implementado em
Vite + React. Se a intenção futura for migrar para Next.js + TypeScript +
Tailwind, isso é uma reescrita à parte — o código atual não usa nada disso.
