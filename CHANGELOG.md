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

## [0.6.0] — 2026-09-14

### Alterado
- **"Ticket médio" sai da Home, entra "Receita total".** O indicador principal
  agora é o **valor acumulado dos contratos efetivamente fechados** (só propostas
  com status `accepted`), não uma média por proposta. Continua respeitando a
  moeda de exibição escolhida no painel (cada moeda é convertida com a cotação
  atual antes de somar). O campo `valorMedio` segue na resposta da API para não
  quebrar nada, mas não é mais exibido.
- **Hierarquia dos KPIs da Home.** Os indicadores passam a ficar em dois grupos
  nomeados, em vez de uma fileira solta de quatro:
  - **Resultado** — Receita total (card em destaque, ocupando o dobro da
    largura), Contratos fechados e Clientes.
  - **Em andamento** — Em negociação, Propostas no mês, Taxa de aceitação e
    Tempo até o aceite (que antes vivia escondido como legenda do ticket médio).
  Nenhuma cor ou fonte nova: o destaque usa o mesmo tom já aplicado no card de
  Insights. No mobile a grade cai para 2 colunas e depois 1, com o card de
  destaque acompanhando.

### Adicionado
- KPIs novos em `GET /proposals/dashboard`: `receitaTotal`, `contratosFechados`,
  `clientes` (carteira inteira) e `clientesFechados` (quantos já aceitaram).
  Duas consultas viraram uma só, então o painel não ficou mais pesado.

### Adicionado (conformidade)
- **Pedido de reembolso dentro do app.** Novo bloco no fim de Configurações, com
  motivo e mensagem opcional. Ao confirmar: grava em `refund_requests`
  (migração `022`), manda um e-mail pro suporte com o contexto pra decidir
  (plano, valor, data do pagamento, uso até aqui) e **marca em destaque se o
  pedido está dentro dos 7 dias do art. 49 do CDC** — nesse caso a devolução é
  obrigatória e integral, não é decisão comercial. A pessoa recebe confirmação
  automática por e-mail na hora.
  O motivo de existir: o Decreto 7.962/2013 (art. 5º, §1º) exige que o direito
  de arrependimento possa ser exercido **pela mesma ferramenta usada para
  contratar** — quem assina dentro do app tem que poder pedir dentro do app. O
  §4º exige a confirmação imediata do recebimento, e o art. 4º, parágrafo único,
  resposta em até 5 dias.
  O endpoint **não estorna nada** e não mexe no acesso: o estorno segue sendo
  feito no painel do Mercado Pago, e quem encerra o período é o webhook.

### Alterado (Termos de Uso)
- Seção 4 reescrita. Ela ainda afirmava que **"não há cobrança automática nem
  renovação automática"**, o que virou mentira na v0.5.0 — um cliente cobrado
  automaticamente teria os próprios Termos como prova contra o serviço. Agora
  descreve as duas formas de contratar, como cancelar a recorrência sozinho, o
  que acontece quando o pagamento não entra, e dois pontos novos: o direito dos
  7 dias vale **mesmo se a pessoa já tiver usado** no intervalo (e não é afetado
  pelo plano Gratuito), e o **plano anual passa a ter devolução proporcional aos
  meses cheios não usufruídos** depois dos 7 dias. A regra anterior retinha o
  ano inteiro, o que é o tipo de cláusula que vira chargeback e discussão de
  abusividade.
- FAQ do Suporte ajustado pelo mesmo motivo, e ganhou a pergunta "Como peço
  reembolso?".

### Corrigido
- **Assinatura vencida parecia estar ativa.** Com o plano expirado, a tela ainda
  exibia a barra de cota ("2 de 5 propostas usadas · Renova todo mês"), o selo
  escuro do plano pago e "3 propostas restantes" na barra lateral — quem não
  conhece o sistema concluía que ainda estava pagando. Agora, quando a conta
  está aguardando pagamento:
  - **Plano e uso** troca a barra de progresso por um aviso âmbar dizendo
    "Plano X vencido em DD/MM/AAAA", explicando que a cota está pausada. O botão
    vira "Reativar acesso".
  - O **selo do plano** no topo de Configurações vira âmbar com "X · vencido",
    em vez do selo escuro de plano pago.
  - A **barra lateral** mostra "Assinatura vencida" no lugar da contagem de
    propostas restantes.
  - Com renovação automática ligada, some a frase "Renovação automática ativa,
    você é cobrado sem precisar fazer nada" — que contradizia o aviso de vencido.
    No lugar entra "A última cobrança automática não foi concluída". O botão de
    cancelar continua disponível (é a única saída de quem não quer ser cobrado
    de novo).
  Só muda o que é exibido: o bloqueio real já era feito pelo backend.

## [0.5.0] — 2026-08-31

### Adicionado
- **Assinatura com renovação automática (cartão).** Além do pagamento avulso, o
  cliente pode assinar e o Mercado Pago cobra sozinho a cada ciclo (preapproval).
  Cada cobrança aprovada renova o período e zera a cota. O cancelamento fica em
  Configurações, com confirmação em dois cliques, e o acesso continua até o fim
  do período já pago. Colunas novas: `mp_preapproval_id` e `subscription_kind`.

### Corrigido
- **Estorno/contestação revoga o acesso.** O webhook passa a tratar `refunded`,
  `charged_back` e `cancelled`: o período liberado por aquele pagamento é
  encerrado na hora. Antes, o cliente pedia o estorno e seguia usando o ciclo
  inteiro (prejuízo direto).
- Âncora da cota nunca fica no futuro (protege planos anuais, que ficariam sem
  contagem de cota). Migração `020_quota_anchor_fix`.

## [0.4.0] — 2026-08-25

### Alterado (regras de cobrança)
- **Cota atrelada ao ciclo da assinatura, sem acúmulo.** Antes a cota renovava no
  dia 1º do calendário, o que desalinhava do ciclo pago (quem assinava dia 20
  ganhava cota nova no dia 1º, dobrando o que tinha direito no mesmo ciclo).
  Agora conta a partir do "aniversário" da assinatura (coluna `quota_anchor`,
  gravada a cada pagamento aprovado): o que não foi usado **não vira crédito**, e
  cada pagamento inicia um ciclo zerado. Vale igual para planos mensais e anuais.
- **Assinatura vencida não rebaixa mais para Gratuito.** A conta entra em
  **aguardando pagamento** (só leitura), preservando o plano: dá para ver as
  propostas e os links públicos já enviados continuam no ar, mas criar, editar,
  enviar, usar recursos premium, subir imagem e baixar PDF ficam bloqueados até
  o pagamento entrar. Há **3 dias de carência** após o vencimento (cobre atraso
  de boleto/Pix). O bloqueio é calculado por data, então não depende do job
  diário ter rodado. Ao pagar, tudo volta na hora e a cota começa zerada.
- Aviso no painel com o estado da assinatura e botão de renovar.

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
