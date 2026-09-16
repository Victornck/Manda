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

## [0.8.1] — 2026-09-16

### Corrigido
- **A proposta aberta no celular não exige mais virar o aparelho.** Os 12
  modelos eram escritos em cima da folha A4 de 794px: grades de duas e três
  colunas, larguras fixas de 150 a 300px e margens de até 84px. Num aparelho
  de 390px isso não cabia — a coluna de texto sobrava com menos de 90px e
  palavras quebravam no meio ("Criaçã / o"), quando não abria com rolagem
  lateral. Agora a folha carrega uma folha de estilo própria, injetada uma
  única vez, que abaixo de 720px empilha as grades, solta as larguras fixas,
  reduz as margens e derruba os tamanhos de display; abaixo de 420px aperta
  mais um passo. Cada elemento recebe a classe de refluxo derivada do próprio
  estilo na montagem do arquivo, então nenhum modelo ficou de fora e nada
  precisa ser marcado à mão quando um modelo novo entrar.
- **O desenho de tela e o PDF continuam intactos.** O corte é por largura de
  janela (`@media`), não por largura de container, de propósito: a miniatura da
  galeria e o nó escondido que o exportador fotografa têm 794px numa janela
  larga, então continuam recebendo a composição de desktop. Verificado nos 12:
  folha de 794px na tela, folha de 390px sem estouro no celular.
- **O link público parou de cair em "O app não terminou de carregar".** O
  backend lia o `index.html` uma vez na subida e guardava a string em memória.
  Depois de um deploy do front, ele continuava servindo o HTML antigo, que
  apontava para um bundle que não existia mais — todo link de proposta abria
  no aviso de falha até alguém reiniciar o processo. Agora o HTML é relido
  quando o `mtime` do arquivo muda, com a última cópia boa como reserva para o
  instante em que o build está sendo substituído. Os assets de `/assets/`
  passaram a ir com cache imutável e o HTML com `no-cache`, que é o par certo
  para nome de arquivo com hash.

### Alterado
- **A proposta pública ficou mais larga** (520px → 780px), que é a largura em
  que a folha respira sem virar uma coluna estreita no meio da tela.

---

## [0.8.0] — 2026-09-14

### Alterado
- **Os 12 modelos deixaram de ser cards e viraram folhas.** Todo template
  abria com `border + border-radius + box-shadow` — a mesma casca doze vezes,
  que é o que dava a sensação de "12 variações do mesmo arquivo". Agora existe
  uma primitiva `Sheet` com proporção e margens de papel A4 (794px, a mesma
  largura que vai para o PDF), e o que muda entre modelos é a composição dentro
  da folha, não a moldura.
- **Conteúdo e apresentação foram separados.** `model(doc)` normaliza os dados
  uma vez e todo template consome isso, nunca o `doc` cru. Trocar de modelo não
  perde nada, porque nenhum template lê um campo que os outros não leiam.
- **Cada modelo declara o que a identidade dele aguenta.** Temas de folha
  permitidos e quanto da cor de destaque aparece (`hairline`, `restrained`,
  `full`) passaram a ser dados no registro dos modelos. O editor só oferece os
  temas que o modelo suporta, e trocar de modelo ajusta o tema automaticamente
  em vez de deixar a proposta num estado que o desenho novo não cobre.
- **Paleta sem saturação de interface.** As cores padrão dos 12 e os presets do
  seletor saíram do roxo/azul/índigo/mostarda para uma faixa de croma baixo e
  valor escuro. A cor aleatória deixou de sortear hexadecimal puro (que gerava
  neon e fluorescente com a mesma probabilidade) e agora sorteia dentro de uma
  faixa em HSL que sempre resulta em cor de documento.
- **Categorias da galeria classificam por uso, não por cor.** "Vibrantes /
  Escuros / Clean" viraram "Essenciais / Editoriais / Corporativos / Criativos /
  Com foto", e as categorias passaram a morar no registro dos modelos.
- **Nomes dos modelos.** Minimal → Nítido, Colorido → Vívido, Bold → Impacto,
  Recibo → Técnico, Grande → Consultoria, Studio → Estúdio. Os `id` foram
  preservados: estão gravados em `proposals.template`, no gating de plano do
  backend (`BASIC_TEMPLATES`) e nas métricas por template.
- **Proposta pública mais larga** (520 → 780px), acompanhando a folha de 794px.

### Adicionado
- **Quatro modelos reconstruídos do zero**, com composição, hierarquia e
  apresentação de preço próprias:
  - **Técnico** (`recibo`) — era um cupom fiscal com Courier, linha tracejada e
    carimbo girado. Virou ficha técnica: estrutura só de fios, monoespaçada nos
    rótulos e índices, tabela modular com índice por linha.
  - **Carta** (`carta`) — era uma folha com texto centralizado e uma faixa
    tingida. Virou carta comercial: papel timbrado, margem de 84px, medida de
    leitura curta, serifa, condições em bloco e **bloco de assinatura**.
  - **Consultoria** (`grande`) — era um orçamento com uma letra de 320px
    cortada ao fundo. Virou documento B2B: ficha do documento emoldurada,
    seções numeradas, tabela com cabeçalho, resumo financeiro separado,
    cronograma e aprovação.
  - **Estúdio** (`studio`) — era uma barra lateral escura de painel
    administrativo. Virou capa: primeira página inteira em A4, tipografia de
    62px, grid deslocado e blocos de serviço com numeral em corpo grande. A capa
    aceita **foto** (como os modelos Capa e Dossiê) ocupando a página inteira;
    sem foto, ela se sustenta por **composição**: grade editorial de fios, o nome
    do estúdio em corpo de display sangrando pela margem direita, contadores de
    entregas e seções, e um **sumário numerado** que usa a mesma numeração das
    seções do miolo. Tudo desenhado com o que o usuário digitou — nenhum
    elemento gráfico temático, que num sistema de templates só seria verdadeiro
    para um tipo de negócio e mentiria para todos os outros. O wordmark gigante
    desaparece quando o título é longo (aí o título já é o elemento dominante) e
    quando não há nome de empresa (sobra a grade).
- **Visualizador de modelo.** Botão "Ver modelo" no card abre o exemplo em
  tamanho de leitura (794px), com troca de tema, navegação entre modelos por
  ← e →, e um botão que desenha **onde o PDF quebra de página**. O rodapé
  informa quantas páginas o exemplo gera.
- **Fotos de exemplo nos modelos com capa.** `frontend/public/samples/` com
  instruções; `capa.jpg` e `dossie.jpg` são carregados pela galeria quando
  existirem.

### Corrigido
- **O PDF cortava a página no escuro.** O documento inteiro virava uma imagem e
  o jsPDF a reposicionava a cada 297mm, então o corte caía no meio de uma linha
  da tabela, do TOTAL ou da assinatura. Agora cada modelo marca os pontos de
  corte (`Break` / `Break hard`) e o exportador fatia o canvas neles. O nó
  oculto passou a ter largura A4 real (794px, era 720px) e renderiza em modo de
  impressão, sem sombra nem canto arredondado.
- **Páginas internas do PDF ganharam rodapé de continuidade** — empresa, cliente
  e "N / M" — em texto vetorial, com a faixa descontada da altura útil para
  nada do desenho cair por baixo.
- **A galeria mostrava só o cabeçalho de cada modelo.** `.db-dsn-thumb` tinha
  altura fixa de 300px com `overflow: hidden` e um degradê branco por cima:
  todo card exibia os primeiros ~480px do documento, que é justamente a parte
  mais parecida entre os modelos. A miniatura agora é a página renderizada na
  largura real e reduzida proporcionalmente, com altura de uma A4 — todo card
  do mesmo tamanho.
- **A camada de hover do card capturava clique estando invisível.** No celular,
  onde `:hover` nunca dispara, encostar na miniatura já acionava "Usar este
  modelo" — o usuário escolhia um modelo sem nunca ver o botão.
- **Capa e Dossiê sem foto caíam num degradê da cor de destaque.** É o estado
  que todo usuário vê antes de subir a imagem e, se nunca subir, é o que o
  cliente dele recebe. Virou um painel grafite neutro, que agora também é a
  camada de baixo da foto: se a imagem sumir, o painel aparece no lugar de um
  buraco branco na capa. A faixa da imagem subiu de 200/224px para 286/320px,
  e o véu sobre o título foi reforçado porque a foto é do usuário e pode ser
  clara.
- **Sobra da migração no Dossiê:** ainda carregava `border` e `border-radius`
  de card por dentro da folha.

### Nota técnica
- `index.html` passou a carregar a serifa **Zodiak** (Fontshare), usada pelo
  modelo Carta. A cadeia de fallback é de serifas reais, então uma falha de
  carregamento degrada em vez de quebrar.
- Os oito modelos herdados (Nítido, Aurora, Vívido, Editorial, Impacto, Pôster,
  Capa, Dossiê) foram portados para a folha, mas **não** reconstruídos: ainda
  compartilham estrutura de seções entre si e ocupam pouco mais da metade de
  uma página A4. A reescrita deles é o próximo passo.

---

## [0.7.2] — 2026-09-14

### Corrigido
- **Login de conta Google com senha derrubava a requisição (500).** Contas
  criadas pelo Google não têm `password_hash` (fica `null`), e o `login` passava
  esse `null` direto pro `bcrypt.compare`, que estourava
  `Illegal arguments: string, object`. A pessoa via um erro genérico de "algo
  deu errado", sem nenhuma pista de que precisava usar o botão do Google — e
  cada tentativa virava um erro 500 no Sentry. Agora a resposta é um 401 com a
  mesma mensagem que o "Esqueci minha senha" já dava nesse caso.

## [0.7.1] — 2026-09-14

### Alterado
- **"Nova proposta" abre a galeria, não o formulário.** Na 0.7.0 o botão ainda
  caía direto na etapa 2, com os modelos amontoados como 12 chips dentro do
  formulário — ou seja, escolhia-se o modelo *dentro* do formulário, que é o
  oposto do fluxo em etapas. Agora `newProposal` cria a proposta em memória
  (doc em branco + id de rascunho) e abre a **Etapa 1 — Escolha um modelo**, em
  tela cheia, com os cards grandes, prévia, nome, categoria e filtros que já
  existiam. Vale para todos os pontos de entrada: sidebar, Home, lista vazia,
  tutorial e a calculadora (que leva os itens calculados junto).
- **Grade de 12 modelos sai do formulário.** No lugar, uma linha discreta:
  "Modelo atual: Minimalista" + botão "Trocar modelo".
- **Etapa 3 de verdade.** O botão da barra virou "Revisar e concluir" e abre um
  painel com cliente, empresa, título, modelo, nº de itens e valor total, com
  "Voltar e editar" ou "Concluir proposta". Avisa quando o valor está zerado.
  Não é só cosmético: concluir consome uma proposta da cota do plano e antes
  não havia nenhuma confirmação — um clique errado gastava cota sem volta.
- A galeria continua sendo **um único componente** (`DesignGallery`), usado
  tanto como aba do menu quanto como etapa 1. O que muda é só o cabeçalho, o
  selo "Em uso" e o aviso de dados preservados, via props.

## [0.7.0] — 2026-09-14

### Alterado (fluxo de criação em etapas)
- **Trocar de modelo não apaga mais a proposta.** Era o bug central: clicar em
  "Usar" na galeria chamava `startWithDesign`, que fazia
  `setDoc({ ...BLANK_DOC, template })` e zerava tudo. Quem preenchia cliente,
  itens, valores e logo e voltava pra trocar o desenho perdia o trabalho
  inteiro. Agora existe o estado `tplSwap`: ir do editor para Modelos marca que
  é uma **troca de desenho**, e escolher outro modelo altera exclusivamente
  `doc.template`. Todo o resto do `doc` fica intacto.
  A separação que o fluxo exige já existia no estado (`doc` guarda dados e
  aparência juntos), então nada foi duplicado — só passou a existir um caminho
  que mexe apenas na parte visual.
- **Barra inferior virou a navegação do fluxo.** No editor: "← Modelos" à
  esquerda, a trilha *Modelo › Editando proposta › Concluir* no meio e o resumo
  do valor + "Concluir proposta" à direita. Abaixo de 1120px a trilha vira
  "Etapa 2 de 3"; no mobile ela ocupa a primeira linha inteira da barra. Some
  quando a proposta já foi enviada (só leitura).
- **Galeria ganhou contexto.** Vindo do editor, ela mostra "Etapa 1 de 3 ·
  Trocando o modelo", uma faixa avisando que nada será perdido (com o nome do
  cliente), marca o modelo **Em uso**, troca "Usar" por "Aplicar" e oferece duas
  saídas explícitas: *Voltar para a edição* e *Começar do zero* — que é como a
  pessoa cria uma proposta nova sem ambiguidade.
- Editor ganhou "Etapa 2 de 3" no topo e um link "Ver galeria" ao lado dos chips
  de modelo, ligando o atalho inline (que já preservava os dados) à galeria.
- `startWithDesign` passou a respeitar assinatura vencida e a moeda da conta,
  que ele ignorava — entrar por Modelos burlava o bloqueio que "Nova proposta"
  já fazia.

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
  - **Resultado** — Receita total (card branco como os outros, ocupando o dobro
    da largura; o destaque vem do número maior e em peso 900), Contratos
    fechados e Clientes.
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
