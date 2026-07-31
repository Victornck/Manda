# Comandos do Manda (cola e usa)

Referência rápida de tudo que a gente usa no dia a dia. Guarde este arquivo.

## Informações fixas

- **IP do servidor:** `179.198.105.127`
- **Domínio:** `mandaproposta.com`
- **Pasta do projeto no servidor:** `/opt/manda`
- **Nome do processo (PM2):** `manda`

Regra de ouro do deploy: **edita o código → `git push` no PC → `git pull` no servidor**. O passo do meio (push) é o que mais esquece.

---

## Deploy (o mais usado)

**1. No seu PC** (PowerShell/VS Code, um comando por linha, porque o PowerShell nao aceita `&&`):
```
git add -A
git commit -m "mensagem do commit aqui"
git push
```

**2. Conectar no servidor:**
```
ssh root@179.198.105.127
```
(digita a senha root; nao aparece nada enquanto digita, e normal)

**3. No servidor** (aqui e Linux, o `&&` funciona):

Se mudou **so o frontend** (telas, textos, estilos):
```
cd /opt/manda && git pull && cd frontend && npm run build
```

Se mudou o **backend** (rotas, .env, lógica de servidor):
```
cd /opt/manda && git pull && cd frontend && npm run build && cd ../backend && pm2 restart manda
```

Se mudou **so o backend** (sem tocar no front):
```
cd /opt/manda && git pull && cd backend && pm2 restart manda
```

---

## Servidor (comandos comuns)

Ver os logs do app (Ctrl+C pra sair, nao derruba nada):
```
pm2 logs manda --lines 20
```

Reiniciar o app (depois de mudar o `.env`, por exemplo):
```
pm2 restart manda
```

Ver status do app:
```
pm2 status
```

Editar o `.env` de producao (depois salva com Ctrl+O, Enter, Ctrl+X, e reinicia):
```
cd /opt/manda/backend
nano .env
pm2 restart manda
```

---

## Banco de dados

Aplicar migrations novas (no servidor, dentro de backend):
```
cd /opt/manda/backend && npm run migrate
```

---

## Testes (na sua maquina, dentro de backend)

```
cd backend
npm test
```

---

## Manutencao: limpar imagens orfas no disco

No servidor, dentro de `/opt/manda/backend`.

Ver o que seria apagado, sem apagar (sempre faca isto primeiro):
```
npm run cleanup:uploads -- --dry-run
```

Apagar de verdade as imagens que nenhuma proposta usa:
```
npm run cleanup:uploads
```
(roda uma vez por mes, ja e suficiente)

---

## Rodar local (desenvolvimento, na sua maquina)

Backend (uma aba do terminal):
```
cd backend
npm run dev
```

Frontend (outra aba):
```
cd frontend
npm run dev
```
O app abre em `http://localhost:5173`.

---

## Checagens rapidas

Ver se o dominio aponta pro servidor (no PC):
```
nslookup mandaproposta.com
```
(tem que responder `179.198.105.127`)

Ver o codigo-fonte cru de uma pagina (no navegador): **Ctrl+U**

Abrir DevTools no navegador: **F12** (aba Console pra erros, aba Network pra requisicoes)

Recarregar ignorando cache: **Ctrl+Shift+R**

---

## Se a conexao SSH cair

E normal (timeout/rede). E so reconectar:
```
ssh root@179.198.105.127
```
O servidor e o app continuam rodando; so a janela do terminal desconectou.
