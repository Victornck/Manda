# Changelog do Manda

Este projeto segue o **Versionamento Semântico** (SemVer): `MAJOR.MINOR.PATCH`.

- **MAJOR** — mudanças incompatíveis ou muito grandes.
- **MINOR** — novas funcionalidades compatíveis com o que já existe.
- **PATCH** — correções e pequenos ajustes.

**Fonte única da versão:** o campo `version` em `frontend/package.json`. O Vite
injeta esse valor como `__APP_VERSION__` (ver `vite.config.js`), e ele é exibido
no rodapé da barra lateral ("Manda vX.Y.Z"). O `backend/package.json` é mantido
no mesmo número para não divergir. A cada mudança relevante concluída, atualize a
versão nos dois `package.json` e registre a entrada aqui.

---

## [0.3.0] — 2026-08-21

### Adicionado
- **Enquadramento da capa:** nos modelos com foto (Capa e Dossiê), o usuário pode
  arrastar a imagem pra escolher a parte visível (pan), com mouse ou toque, sem
  distorcer (mantém a proporção). O enquadramento é salvo junto da proposta
  (coluna `cover_pos`, formato "x,y" em %) e respeitado no editor, na prévia, no
  link público e no PDF. Botão "Centralizar" para resetar. Propostas antigas sem
  posicionamento continuam centralizadas (compatível). Validação no backend
  (só aceita "x,y"); as validações de upload/segurança da imagem não foram tocadas.

## [0.2.3] — 2026-08-21

### Corrigido
- **SEO / indexação:** a canônica era fixa (apontava sempre pra home) e, por ser
  um SPA, todas as rotas herdavam ela, então o Google marcava /precos,
  /privacidade etc. como "página alternativa" e não indexava. Agora o backend
  injeta a canônica e a og:url corretas por rota (cada URL aponta pra si mesma).
- **Ruído no Sentry:** ignora erros do navegador interno do Instagram/Facebook
  (window.webkit.messageHandlers / sendDataToNative), que não são bugs do app.

## [0.2.2] — 2026-08-12

### Corrigido
- **Mobile:** ao criar uma proposta, o editor abre nos campos editáveis em vez de
  já mostrar a prévia por cima. A prévia passa a abrir só quando o usuário toca no
  olhinho ("Pré-visualizar"). Desktop mantém a prévia ao lado dos campos.

## [0.2.1] — 2026-08-12

### Melhorado
- **Sidebar do desktop expande no hover:** recolhida (só ícones) por padrão, ao
  passar o mouse ela abre suavemente mostrando os textos e recolhe ao sair. O
  botão de fixar (pin) continua funcionando. Ícones ficam alinhados à esquerda
  nos dois estados, sem "pulo" ao expandir. Mobile segue com o drawer por toque.

## [0.2.0] — 2026-08-12

### Adicionado
- **Mensagem pronta ao concluir a proposta:** botão "Copiar mensagem" que já monta
  o texto com o nome do cliente, o link público e um CTA, pronto para colar no
  WhatsApp/Instagram. O "Copiar link" continua disponível separadamente.
- **Campos dinâmicos por modelo:** cada template define quais campos exibe
  (`templateFields` em `templates/designs.jsx`). O editor passa a mostrar só os
  campos que o modelo usa (ex.: modelos sem pagamento/revisões não exibem esses
  campos). Preview, PDF e link público já filtravam por conteúdo e seguem
  consistentes, sem duplicar a regra.
- **Navegação colapsável:** sidebar recolhível no desktop (só ícones, expansível
  e lembrada) e drawer sobre o conteúdo no mobile, liberando 100% da largura.

### Corrigido
- Experiência mobile do editor, calculadora e suporte (tela cheia, safe-area do
  iPhone, prévia em camada, descrição de item que quebra linha).
- Menu de perfil que quebrava no mobile, e-mail conectado que vazava da caixa,
  botão do onboarding que estourava a largura.

## [0.1.0]

- Versão inicial: criação, envio e acompanhamento de propostas; múltiplos
  modelos; pagamentos via Mercado Pago; envio por Gmail; calculadora de preço.
