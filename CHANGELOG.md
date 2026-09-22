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

## [0.10.1] — 2026-09-22

### Adicionado
- **Filtros "Gratuitos" e "Premium" na galeria de modelos.** Ficam na mesma
  barra, depois de um fio que separa os dois eixos: estilo (Essenciais,
  Editoriais…) responde "que cara tem", plano responde "eu posso usar". Os dois
  combinam, e as contagens se cruzam — com "Gratuitos" ligado, "Essenciais"
  mostra 1, não 3. Clicar de novo no chip aceso desliga o filtro.
- Categoria que fica sem nenhum modelo no plano escolhido vira não clicável, e
  se isso acontecer com a categoria que já estava ativa ela volta para "Todos".
  Sem isso dava para chegar numa grade vazia sem saber qual dos dois filtros
  tinha causado.

### Alterado
- **A lista de modelos gratuitos deixou de existir em duplicata no front.** Era
  `const BASIC_TPL_IDS = ["minimal", "bold"]` dentro do Dashboard, com um
  comentário dizendo que "espelha o plano Básico do backend" — ou seja, uma
  segunda fonte da verdade esperando divergir. Agora o registro dos modelos
  marca `free: true` e o cadeado e o filtro leem dali. Quem decide quem pode
  usar o quê continua sendo o servidor.
- **Teste novo (`test/unit/plan-templates.test.js`)** que quebra se a galeria e
  o `BASIC_TEMPLATES` do servidor discordarem sobre quais modelos são
  gratuitos. Divergir significa, na prática, ou oferecer um modelo que o
  servidor vai recusar na hora de salvar, ou esconder um que é grátis.
  Verificado que ele falha quando a divergência é introduzida.

---

## [0.10.0] — 2026-09-22

### Alterado
- **A Carta deixou de ser uma carta e virou apresentação comercial.** Era papel
  timbrado: serifada, "Ao cuidado de", prosa em medida curta, bom para advogado
  e fraco para quem vende pacote de conteúdo — que é quem usa este app. O `id`
  continua `carta` (banco, métricas e gating dependem dele); o que mudou é o
  desenho.
  Estrutura nova, na ordem: capa com manchete de duas linhas em caixa alta e
  caixa-resumo com cliente de um lado e investimento com a data do outro;
  "Quem apresenta"; tabela de serviços com cabeçalho sombreado e linhas
  zebradas; "Investimento" em faixas, fechando com o valor total em faixa de
  tinta cheia; "Condições"; e "Aprovação". Barra de tinta no topo e rodapé
  corrido, como na referência.
- **O bloco de assinatura foi preservado.** É o único dos 12 que tem um, e é o
  que faz o documento valer como aceite no papel. Mudou de lugar: agora mora
  dentro do bloco de aprovação, no encerramento.
- **A tabela se adapta quando a coluna Quantidade está desligada.** A grade é
  declarada num lugar só — três colunas com quantidade, duas sem — então
  cabeçalho e linhas nunca saem de alinhamento e não sobra célula vazia.
- **Ela deixou de se chamar Carta.** Agora é **Agência · Pacote de conteúdo**,
  e saiu da prateleira "Editoriais" para "Corporativos" — não é mais um modelo
  editorial serifado, é um documento comercial estruturado. O `id` segue
  `carta`; nome, subnome e categoria são só vitrine.
- **A capa do exemplo passou a ser branca**, não mais o papel creme. O creme
  combinava com a carta timbrada; com a barra de tinta no topo e as faixas
  cinza, o branco é o fundo certo. O tema creme continua disponível para quem
  quiser escolher. A cor de destaque padrão do modelo saiu do marrom quente
  (que existia para casar com o creme) para um cinza neutro.
- **O exemplo da galeria deixou de ser uma proposta de advocacia.** Passou a ser
  um pacote de conteúdo mensal, com a coluna de quantidade ligada — que é o que
  o card precisa mostrar agora que o modelo se chama Agência. É só o exemplo da
  vitrine; nenhuma proposta real foi tocada.
- **A tipografia continua a do app** (Satoshi / General Sans), não a Arial da
  referência. Uma fonte estranha só neste modelo pareceria erro de carregamento
  ao lado dos outros onze, e o rasterizador do PDF já é sensível a fonte que não
  carrega. O que veio da referência foi o tratamento: manchete pesada em caixa
  alta, faixas cinza, barra no topo, rodapé corrido.

### Adicionado
- **Data de emissão na capa.** Já existia em `proposals.created_at` desde a
  `001` e a rota do dono já a devolvia; faltava na vista pública, então o
  cliente veria a capa sem data enquanto o dono via com. Uma linha em
  `routes/public.js`. Nenhum campo novo, nenhum dado inventado.

### Corrigido
- **Criar proposta voltava "Erro interno do servidor".** Quando a coluna
  `show_qty` entrou no `insert into proposals`, o nome da coluna e o valor
  foram acrescentados, mas a lista de placeholders parou no `$25`: 26 colunas
  para 25 expressões. O Postgres recusa a query inteira e a API devolve 500.
  O `update` estava correto, então **editar** um rascunho funcionava e só
  **criar** quebrava. Nunca chegou a produção — a 0.9.0 não foi publicada —
  mas quebrava para quem rodasse o backend local contra o banco real.
- **Teste novo (`test/unit/sql-shape.test.js`)** para essa classe de erro, que
  o JavaScript não pega em tempo nenhum: confere que colunas, placeholders e
  valores do `insert` batem, que os `$n` formam uma sequência sem buraco, que o
  `update` passa tantos valores quanto o maior placeholder, e que toda coluna
  gravada na criação também é gravada na edição. Verificado que ele falha quando
  o bug é reintroduzido.

### Observação
- Os outros 11 modelos não foram tocados: verificado pixel a pixel, só a Carta
  mudou.
- Paginação do PDF conferida em 5 cenários: nenhuma linha de tabela é cortada
  ao meio e nenhum título de seção fica sozinho no fim da página (o marcador de
  quebra vai ANTES do título, nunca depois).
- **Repetir o cabeçalho da tabela quando ela passa de uma página não é possível
  com o exportador atual.** Ele fotografa o documento inteiro e fatia a imagem,
  então não há como injetar uma linha nova no meio do corte. Seria preciso
  trocar o pipeline por um que desenhe o PDF em vetor.

---

## [0.9.1] — 2026-09-22

### Alterado
- **O botão "Aceitar proposta" não vai mais no PDF exportado.** Num arquivo não
  há onde clicar: o botão ocupava espaço e sugeria uma ação que o papel não
  entrega. Ele continua inteiro na tela — na prévia do editor, na proposta
  pública que o cliente abre pelo link, na miniatura da galeria e na prévia do
  modelo — e a funcionalidade de aceitar não foi tocada.
  Para isso os dois sinais foram separados. `print` continua significando
  "desenha como folha nua, sem sombra nem canto arredondado", e vale para o PDF
  mas TAMBÉM para a miniatura e a prévia. O sinal novo, `pdf`, significa "este
  render vai virar arquivo" e é marcado só nos dois nós escondidos de
  exportação (o do editor e o da lista de propostas). Se o botão fosse escondido
  por `print`, a galeria inteira mudaria junto.
  Sai só o BOTÃO: título de seção, bloco de assinatura e os textos em volta
  continuam no PDF. Verificado nos 12 modelos, em 5 cenários de conteúdo: tudo
  o que está acima do botão sai pixel a pixel igual nas duas versões (a única
  exceção é o Aurora, cujo fundo é um degradê de altura inteira e portanto se
  recalcula quando a página encolhe — diferença máxima de 3 em 255).
- **O controle da coluna Quantidade virou uma chave liga/desliga.** Era um botão
  com "#" que ficava aceso quando ativo, o que não deixava claro se era um
  filtro, uma aba ou um interruptor. Agora é o mesmo `.db-sw` que o app já usa
  em "Usar gradiente" e na renovação automática: pílula de 42×24, cor de
  destaque quando ligada, cinza quando desligada, com transição de 180ms no
  trilho e no botão (e desligada por completo sob `prefers-reduced-motion`,
  que a regra já existente cobre). O "#" saiu, junto com o ícone que ninguém
  mais usava.
- **Proposta nova nasce com a coluna ligada.** O item inicial já vem com
  quantidade 1, e itens vindos da calculadora de preço também.
  **Proposta que já existe continua como foi salva** — abrir uma proposta
  antiga não liga a coluna sozinha. Ligar mudaria o documento sem ninguém
  pedir e, como a quantidade multiplica, mexeria no total de uma proposta já
  enviada.

---

## [0.9.0] — 2026-09-22

### Adicionado
- **Coluna Quantidade nos itens da proposta — opcional, por proposta.** Fica
  desligada por padrão e, enquanto estiver desligada, a proposta continua
  exatamente como sempre foi: ITEM e VALOR. Ligada pelo botão "Quantidade" na
  seção Investimento do editor, a proposta passa a mostrar QUANTIDADE, ITEM e
  VALOR, e o valor digitado no item passa a ser o preço **por unidade** — a
  linha mostra o total dela (quantidade × unitário) e o total geral soma isso.
  Migração `024`: uma coluna booleana `proposals.show_qty`, default `false`.
  A quantidade de cada item não precisou de coluna: `proposals.items` já é
  `jsonb` desde a `001`, então cada item passou a poder levar um campo `qty`.
- **Cada modelo mostra a quantidade no idioma dele.** Onde a lista de itens já
  era tabela (Técnico e Consultoria), a coluna de índice dá lugar à quantidade e
  o cabeçalho vira QTD · DESCRIÇÃO · VALOR — continua com três colunas, sem
  mexer na largura nem no refluxo de celular. Nos que não são tabela (Carta com
  linha pontilhada, Estúdio com numeral gigante, e os oito herdados), a
  quantidade entra colada ao nome, como "3× Vídeo institucional". Em todos, uma
  linha miúda embaixo do item mostra de onde saiu o total ("R$ 240 × 3") sempre
  que a quantidade for maior que 1.

### Observação sobre compatibilidade
- Item sem `qty` vale 1 — que é o caso de **toda** proposta anterior a esta
  versão. Por isso ligar a coluna numa proposta antiga não muda o total dela:
  só acrescenta a coluna, com 1 em cada linha.
- Desligar a coluna **não apaga** as quantidades já digitadas; só para de
  aplicá-las. Desligar devolve o total anterior, e religar traz de volta o que a
  pessoa tinha posto.
- Verificado modelo a modelo: com a coluna desligada, os 12 renderizam **pixel a
  pixel** o mesmo que renderizavam antes desta versão. As quebras de página do
  PDF continuam caindo nos marcadores declarados, e os 12 seguem sem estouro
  lateral em 360px e 390px.
- A conta mora em `lib/items.js`, com uma cópia gêmea no backend e outra no
  front, porque são dois pacotes npm separados. É a mesma regra que grava
  `proposals.value` e que desenha o total na proposta — elas têm de bater.

---

## [0.8.4] — 2026-09-16

### Adicionado
- **`users.proposals_count`** (migração `023`): contagem real de propostas por
  usuário, mantida em dia por trigger em `proposals` (insert, delete e troca de
  dono). Usa a chave estrangeira que já existia, `proposals.user_id → users.id`.
  O backfill preenche os usuários atuais; quem não tem proposta fica em `0`.
  RLS já estava habilitado em `users` desde a `003_security`; nenhuma policy foi
  criada, removida ou alterada.
  **Não é a cota do plano.** A cota continua vindo de `proposal_usage`, que é
  append-only de propósito — apagar proposta não devolve cota. Esta coluna cai
  quando o usuário exclui uma proposta, então não serve para cobrança.

---

## [0.8.3] — 2026-09-16

### Alterado
- **A mensagem pronta pro cliente foi reescrita no tom de quem manda a
  proposta.** A anterior era uma linha de saudação com emoji, o link e um
  "qualquer dúvida" — não dizia ao cliente o que fazer depois de abrir. Agora
  abre pelo primeiro nome, entrega o link, explica que o aceite é o botão no
  fim da proposta, oferece ajuste e fecha agradecendo. Os blocos vão separados
  por linha em branco, que é como o WhatsApp respira: um parágrafo único de
  seis linhas ninguém lê até o fim. Sem nome de cliente a frase começa direto
  ("Preparei sua proposta..."), o nome sai com inicial maiúscula mesmo se
  digitado em caixa baixa, e tratamento leva o nome junto — antes
  "Dr. Henrique Salles" virava "Dr." sozinho.

---

## [0.8.2] — 2026-09-16

### Corrigido
- **O campo "Empresa" era impresso como se fosse o nome de quem envia.** No
  formulário, "Empresa" fica na mesma linha de "Cliente" e é preenchida junto
  com ele (o app até completa sozinho a partir do histórico daquele cliente):
  é a empresa **do cliente**. Mas cinco modelos imprimiam esse valor ao lado do
  logo do remetente, com "Seu estúdio" / "Seu escritório" de reserva. Na
  prática: quem deixava o campo em branco mandava uma proposta assinada
  "Seu estúdio"; quem preenchia mandava uma proposta assinada com o nome do
  próprio cliente. O logo já identifica quem envia, então o texto ao lado dele
  saiu, e a empresa do cliente passou a aparecer onde faz sentido — junto do
  nome do cliente, que é como os outros sete modelos já faziam.
- **Dois rodapés podiam imprimir "Manda" como remetente** da proposta, quando o
  campo estava vazio. Agora imprimem o tipo do documento ("Proposta técnica",
  "Proposta comercial") e o destinatário.
- **O rótulo fixo "PROPOSTA" saiu da capa do Estúdio.** Não tinha dado por trás
  nem forma de remover, e repetia o que a capa já diz. O bloco de assinatura da
  Carta e da Consultoria também deixou de inventar um nome para a contratada: a
  linha fica em branco para assinatura à mão, com o papel de cada parte embaixo.

### Observação
- O app ainda **não tem campo para o nome de quem envia** a proposta. A
  identidade do remetente é só o logo (e a bio, quando preenchida). Enquanto
  esse campo não existir, quem não subir logo manda um documento sem nome
  próprio no cabeçalho.

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
