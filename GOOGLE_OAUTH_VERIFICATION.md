# Verificação OAuth do Google — envio de proposta pelo Gmail (`gmail.send`)

Guia para publicar o app e passar na verificação do Google, liberando o envio de
proposta pelo Gmail do usuário para **qualquer pessoa** (hoje só funciona para os
até 100 "test users", com token que expira a cada 7 dias).

**Boa notícia:** `gmail.send` é um escopo **sensível**, não restrito. Então você
precisa da verificação do Google, mas **NÃO** da avaliação de segurança CASA
(aquela cara, de US$540+/ano). Sua verificação é só a revisão do próprio Google,
de graça. O custo é preencher formulário e gravar um vídeo curto.

---

## 0. Pré-requisito: o fluxo tem que FUNCIONAR em produção primeiro

Você vai precisar gravar o fluxo funcionando, então antes de tudo confirme, no ar:

- No `.env` de produção estão setados `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e
  `GOOGLE_OAUTH_REDIRECT=https://mandaproposta.com/api/integrations/google/callback`.
- No cliente OAuth (Google Cloud → Credenciais → "Manda Web"), em **URIs de
  redirecionamento autorizados**, existe `https://mandaproposta.com/api/integrations/google/callback`.
- Teste real: entra no app → Configurações → **Conectar Gmail** → autoriza →
  cria/conclui uma proposta → **Enviar por e-mail** para você mesmo. Chegou o
  e-mail vindo do SEU Gmail? Então o fluxo está pronto para ser gravado.

---

## 1. Tela de consentimento (Google Cloud → APIs e Serviços → Tela de permissão OAuth)

Preencha/confirme:

- **Tipo de usuário:** Externo
- **Nome do app:** Manda
- **Logo do app:** o logo real (PNG)
- **E-mail de suporte do usuário:** seu e-mail
- **Página inicial do app:** `https://mandaproposta.com`
- **Política de privacidade:** `https://mandaproposta.com/privacidade`
- **Termos de serviço:** `https://mandaproposta.com/termos`
- **Domínios autorizados:** `mandaproposta.com` (só funciona porque o domínio já
  foi verificado no Search Console)
- **E-mail de contato do desenvolvedor:** seu e-mail
- **Escopos:** adicione `https://www.googleapis.com/auth/gmail.send` (vai aparecer
  marcado como "sensível")

Depois, mude o status de **"Testing" para "Em produção"** e **envie para verificação**.

---

## 2. Justificativa do escopo (cole no formulário)

O Google pede em **inglês**. Cole isto no campo de justificativa do `gmail.send`:

> Manda is a web app that helps freelancers and small businesses in Brazil create
> commercial proposals and send them to their clients. Users optionally connect
> their own Gmail account so the proposal email is delivered to the client **from
> the user's own email address**, preserving their professional identity and
> improving deliverability and trust.
>
> We request `gmail.send` **only to send a single transactional email per
> proposal**, triggered by the user's explicit action (the user clicks "Send by
> email"). The email contains a link to the proposal the user created. We **only
> send** email; we never read, modify, delete, or access any existing email or
> mailbox data, and we do not send bulk or marketing email. The refresh token is
> **stored encrypted at rest** and is used only to obtain short-lived access
> tokens to send these proposal emails. Users can disconnect Gmail at any time in
> the app's settings, which revokes the token.
>
> `gmail.send` is the minimum necessary scope: the core value is that the email is
> sent from the user's own Gmail identity, and we never need read or modify access
> because we do not touch mailbox contents.

---

## 3. Roteiro do vídeo demo (YouTube, "não listado")

Grave a tela mostrando o fluxo real, **sem cortes que escondam a autorização**.
Regras do Google que o vídeo TEM que cumprir:

1. Mostrar o **nome do app** ("Manda") na tela de consentimento.
2. Mostrar a **barra de endereço** na tela de consentimento (tem que aparecer
   `accounts.google.com` com o `client_id` do seu app na URL).
3. Mostrar o **fluxo de autorização em INGLÊS** (troca o idioma da sua conta Google
   para inglês antes de gravar, senão eles pedem regravação).
4. Mostrar a **funcionalidade que o escopo habilita** (o envio de fato).

Sequência para gravar (2 a 4 min):

1. Abre `https://mandaproposta.com` (rapidinho, pra mostrar o app).
2. Faz login no Manda.
3. Vai em **Configurações → Conectar Gmail** e clica.
4. Aparece a **tela de consentimento do Google** (em inglês). Deixa a barra de
   endereço visível. Mostra que pede a permissão "Send email on your behalf".
   Seleciona a conta e clica em **Allow/Continue**.
5. De volta ao app, mostra o **Gmail conectado**.
6. Abre/conclui uma proposta, clica em **Enviar por e-mail**, põe um e-mail de
   destino e envia.
7. Mostra a **confirmação de envio** e, de preferência, o **e-mail chegando** na
   caixa do destinatário, vindo do e-mail do usuário. Isso prova o uso do `gmail.send`.

---

## 4. Cuidados que fazem o Google recusar (evite)

- Consentimento **não** em inglês → pedem regravação.
- Barra de endereço **escondida** no vídeo → recusam.
- Logo/homepage/privacidade/termos **fora do ar** ou inconsistentes → recusam.
- Pedir mais escopo do que usa → recusam. Peça **só** `gmail.send`.
- App ainda em "Testing" na hora de enviar → mude para produção.

---

## 5. Enviar e esperar

- Depois de enviar, a análise leva de **dias a algumas semanas**.
- O Google pode responder por e-mail pedindo esclarecimento. Responda rápido
  (verifique o e-mail de contato do desenvolvedor).
- Enquanto não aprova: o envio por Gmail funciona só para os **test users** que
  você cadastrar (até 100), com aviso de "app não verificado" e token expirando
  em 7 dias. Depois de aprovado: abre para todos e o token para de expirar.
