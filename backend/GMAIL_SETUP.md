# Enviar propostas pelo Gmail do usuário

O código já está pronto (backend + frontend + banco). Falta só a configuração no
Google Cloud, que só você pode fazer, e colar o Client Secret no `.env`.

## 1. Google Cloud Console (mesmo projeto do login com Google)

1. Ative a **Gmail API**: APIs e serviços > Biblioteca > procure "Gmail API" > Ativar.
2. Tela de consentimento OAuth:
   - Adicione o escopo `https://www.googleapis.com/auth/gmail.send`.
   - Em **Usuários de teste**, adicione o seu e-mail (ex.: victorgabrielberlinck@gmail.com).
   - Pode deixar o app em modo **Testing**: já funciona para os usuários de teste.
3. Credenciais > abra o **ID do cliente OAuth** (tipo Aplicativo da Web) que você
   já usa no login:
   - Copie o **Client Secret**.
   - Em **URIs de redirecionamento autorizados**, adicione exatamente:
     `http://localhost:4000/api/integrations/google/callback`
     (em produção, troque pelo domínio real do backend).

## 2. backend/.env

Preencha (as outras duas linhas já foram adicionadas):

```
GOOGLE_CLIENT_SECRET=<cole o Client Secret aqui>
GOOGLE_OAUTH_REDIRECT=http://localhost:4000/api/integrations/google/callback
```

Reinicie o backend depois de salvar o `.env`.

## 3. Usar

1. No app: **Configurações > Enviar por e-mail > Conectar Gmail**. Você vai ao
   Google, autoriza (a tela "app não verificado" é esperada em modo Testing:
   Avançado > Ir para o app), e volta conectado.
2. Conclua uma proposta e clique em **Enviar** no campo de e-mail. O cliente
   recebe direto do SEU Gmail; a resposta dele cai na sua caixa; e uma cópia fica
   na sua Caixa de Enviados.

## Passar de "teste" para "todos os usuários"

Enquanto o app está em **Testing**, só os e-mails cadastrados como usuário de
teste conseguem conectar (limite de 100). Para liberar para qualquer usuário do
Manda, envie o app para **verificação OAuth** no Google (justificativa do escopo
+ verificação de marca). O escopo `gmail.send` é o mínimo e NÃO exige a auditoria
de segurança independente (CASA) que os escopos de leitura exigem, então a
aprovação é bem mais simples.

## Segurança (já implementado)

- O `refresh_token` de cada usuário é guardado **cifrado** (AES-256-GCM,
  `GOOGLE_TOKEN_KEY` própria) na tabela `google_email_accounts`, com RLS ligado.
- Só o escopo `gmail.send` é pedido: o Manda envia, mas não lê a caixa do usuário.
- Desconectar revoga o acesso no Google e apaga a credencial.
- Endpoint de envio com rate limit dedicado e restrito às propostas do próprio dono.
