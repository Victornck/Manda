# Deploy do Manda numa VPS Hostinger (backend + front + webhook, um domínio só)

Arquitetura: o **Express serve o build do front e a API no mesmo processo** (porta
4000). O **Caddy** fica na frente cuidando do HTTPS e mandando tudo pro Express.
O banco continua no **Supabase**. Resultado:

- App: `https://mandaproposta.com`
- API: `https://mandaproposta.com/api/...`
- Webhook do Mercado Pago: `https://mandaproposta.com/api/webhooks/mercadopago`

Sem túnel, sem URL que muda.

---

## 1. Comprar VPS e domínio

1. Hostinger: contrate uma **VPS KVM** com **datacenter em São Paulo**, sistema
   **Ubuntu 22.04 (ou 24.04)**. Anote o **IP** e a senha de root.
2. Domínio: registre em Registro.br (`.com.br`) ou Cloudflare/Namecheap (`.com`).
3. DNS: crie um registro **A** apontando `mandaproposta.com` (e `www`) para o **IP da VPS**.

## 2. Acessar a VPS e preparar o sistema

No seu PC (PowerShell/terminal):
```
ssh root@SEU_IP
```
Já na VPS:
```
apt update && apt upgrade -y
apt install -y git ufw
# Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v   # confirma
# Firewall: libera SSH e web
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
```

## 3. Baixar o projeto

```
cd /opt
git clone SEU_REPOSITORIO manda
cd manda
```
(Se o código não está no Git, dá para subir por `scp`. Git é bem mais fácil pra atualizar depois.)

## 4. Buildar o front

```
cd /opt/manda/frontend
npm install
npm run build      # gera frontend/dist (o Express serve isso)
```

## 5. Configurar e subir o backend

```
cd /opt/manda/backend
npm install
```

Crie o `backend/.env` de **produção** (copie o seu de dev e ajuste estas linhas):
```
NODE_ENV=production
PORT=4000

# Mesmo banco Supabase de sempre
DATABASE_URL=...
PGSSL=true

# Segredos (mantenha os seus; em produção gere um JWT_SECRET novo se quiser)
JWT_SECRET=...
CPF_ENC_KEY=...
CPF_INDEX_KEY=...
GOOGLE_TOKEN_KEY=...

# URLs de PRODUÇÃO (tudo no mesmo domínio)
APP_URL=https://mandaproposta.com
BACKEND_URL=https://mandaproposta.com
CORS_ORIGIN=https://mandaproposta.com

# Google (login + envio de e-mail). Adicione o redirect novo no Google Cloud (passo 8)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_OAUTH_REDIRECT=https://mandaproposta.com/api/integrations/google/callback

# E-mail de suporte (SMTP do Gmail) — igual ao de dev
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=mandaaisuporte@gmail.com
SMTP_PASS=...
EMAIL_FROM=Manda <mandaaisuporte@gmail.com>

# Mercado Pago — credenciais de PRODUÇÃO (APP_USR-... de produção)
MP_ACCESS_TOKEN=APP_USR-...
MP_WEBHOOK_SECRET=...
```

Rode as migrações (se ainda não rodou no banco de produção) e suba com PM2:
```
npm install -g pm2
node src/migrate.js          # aplica as migrações no banco
pm2 start src/server.js --name manda
pm2 save
pm2 startup                  # cola e roda o comando que ele imprimir (liga no boot)
```
Confira: `pm2 logs manda` deve mostrar "Manda API rodando" e "servindo o front a partir de .../frontend/dist".

## 6. HTTPS + domínio com Caddy

```
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```
Edite `/etc/caddy/Caddyfile` e deixe só isto:
```
mandaproposta.com, www.mandaproposta.com {
    reverse_proxy localhost:4000
}
```
```
systemctl reload caddy
```
O Caddy pega o certificado HTTPS sozinho (Let's Encrypt). Em ~1 min, `https://mandaproposta.com` está no ar. Se der erro de certificado, confirme que o DNS (passo 1) já propagou apontando pro IP certo.

## 7. Mercado Pago em produção

1. Troque no `.env` o `MP_ACCESS_TOKEN` pelas credenciais de **produção** (`APP_USR-...` da aba de produção) e reinicie: `pm2 restart manda`.
2. Configure o webhook de **produção** apontando para:
   `https://mandaproposta.com/api/webhooks/mercadopago`, tópico **Pagamentos**, e copie a **chave secreta de produção** para `MP_WEBHOOK_SECRET`.
3. Cadastre uma **chave Pix** na conta do Manda (senão o Pix não aparece no checkout).

## 8. Google (login + envio de e-mail)

No Google Cloud Console, no cliente OAuth "Manda Web":
- **Origens JavaScript autorizadas:** adicione `https://mandaproposta.com`
- **URIs de redirecionamento autorizados:** adicione `https://mandaproposta.com/api/integrations/google/callback`

## 9. Testar

- Abra `https://mandaproposta.com` (o app carrega servido pelo Express).
- Faça login, crie e conclua uma proposta.
- Assine um plano: agora com HTTPS, o Mercado Pago **redireciona de volta sozinho**
  após aprovar, e o webhook libera o plano.

---

## Como ATUALIZAR depois de mudar o código

```
cd /opt/manda
git pull
cd frontend && npm install && npm run build
cd ../backend && npm install && node src/migrate.js
pm2 restart manda
```
O front novo é servido na hora (arquivos estáticos); o `pm2 restart` recarrega o backend.

## Notas

- O front é buildado com `VITE_API_URL=/api` (arquivo `frontend/.env.production`),
  então ele fala com a API no mesmo domínio. Não precisa mexer.
- `trust proxy` já está ligado no backend, então o rate limit enxerga o IP real
  atrás do Caddy.
- Backups: o banco está no Supabase (tem backup próprio). A VPS guarda só código
  e `.env`, então mantenha o `.env` salvo em local seguro.
