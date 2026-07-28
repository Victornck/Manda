// Base de conhecimento do assistente de suporte do Manda.
// Cada tópico tem palavras-chave (kw), a pergunta (q) e a resposta (a).
// A busca casa a intenção da pergunta com os tópicos, sem depender de IA externa.

export const SUPPORT_TOPICS = [
  // ── Criar e enviar ─────────────────────────────────────────────────────────
  { id: "criar", cat: "Propostas", q: "Como criar uma proposta?", kw: ["criar", "nova", "novo", "montar", "fazer", "comecar", "iniciar", "primeira", "do zero", "proposta", "orcamento"],
    a: "Clique em \"Nova proposta\" na aba Propostas, ou escolha um modelo pronto na aba Templates. Depois preencha o cliente, o título, o escopo e os itens com valores. A prévia à direita já mostra como o cliente vai ver." },
  { id: "concluir", cat: "Propostas", q: "Como concluir e enviar ao cliente?", kw: ["concluir", "finalizar", "terminar", "pronta", "gerar", "link", "enviar", "mandar", "rapido", "publicar", "compartilhar", "disparar"],
    a: "Preencha ao menos o cliente e o título e clique em \"Concluir proposta\" no rodapé do editor. O Manda gera um link curto (manda.app/p/...) que você envia ao cliente por WhatsApp, e-mail ou onde preferir." },
  { id: "copiar", cat: "Propostas", q: "Como copiar o link da proposta?", kw: ["copiar", "colar", "link", "url", "endereco", "pegar", "compartilhar", "mandar", "enviar", "whatsapp", "zap"],
    a: "Assim que você conclui, aparece o botão \"Copiar link\". Se precisar dele de novo depois, vá na aba Clientes, abra o cliente e clique em \"Copiar link\" na proposta." },
  { id: "pdf", cat: "Propostas", q: "Como baixar a proposta em PDF?", kw: ["pdf", "baixar", "download", "exportar", "imprimir", "salvar", "arquivo", "documento"],
    a: "Ao concluir, use o botão \"Baixar em PDF\". Você também pode baixar depois: vá na aba Clientes, abra o cliente e clique em \"Baixar PDF\" na proposta." },
  { id: "editar-enviada", cat: "Propostas", q: "Consigo editar uma proposta já enviada?", kw: ["editar", "enviada", "concluida", "mudar", "alterar", "corrigir", "arrumar", "refazer", "bloqueada", "travada", "trancada", "imutavel"],
    a: "Não dá. Depois de enviada, a proposta trava, assim o mesmo link não é reaproveitado com valores diferentes para outros clientes. Para um novo cliente, crie outra proposta (você pode copiar os dados da anterior)." },
  { id: "rascunho", cat: "Propostas", q: "O que é um rascunho?", kw: ["rascunho", "rascunhos", "salvar", "draft", "guardar", "incompleta", "pendente", "nao concluida"],
    a: "É uma proposta que você começou e ainda não concluiu. Ela fica salva no seu navegador, na aba Rascunhos. Rascunho não gasta a cota do seu plano: só conta quando você conclui." },

  // ── Campos do editor ───────────────────────────────────────────────────────
  { id: "cliente", cat: "Campos", q: "O que colocar em Cliente e Empresa?", kw: ["cliente", "empresa", "contratante", "nome", "para quem", "destinatario"],
    a: "Cliente é o nome de quem vai receber a proposta. Empresa é opcional. Se você já atendeu essa pessoa antes, o nome aparece no autocomplete e preenche a empresa e o e-mail sozinho." },
  { id: "titulo", cat: "Campos", q: "O que é o Título da proposta?", kw: ["titulo", "nome da proposta", "nome do projeto", "assunto", "cabecalho", "servico"],
    a: "É o nome do trabalho, por exemplo \"Produção de vídeo institucional\". Ele aparece em destaque na proposta que o cliente recebe." },
  { id: "escopo", cat: "Campos", q: "Para que serve o Escopo?", kw: ["escopo", "descricao", "detalhes", "entregaveis", "o que inclui", "o que faz", "servico"],
    a: "É onde você descreve o que está incluído no serviço. Deixe claro o que entrega e o que fica de fora: isso evita mal-entendido depois." },
  { id: "itens", cat: "Campos", q: "Como adicionar itens e valores?", kw: ["item", "itens", "valor", "valores", "preco", "servicos", "produtos", "investimento", "somar", "total", "adicionar", "incluir"],
    a: "Na seção Investimento, clique em \"Adicionar item\" e preencha a descrição e o valor. O total soma sozinho. Na dúvida sobre quanto cobrar, use o \"Calcular preço\"." },
  { id: "ocultar-item", cat: "Campos", q: "Como esconder um item do cliente?", kw: ["ocultar", "esconder", "olho", "invisivel", "sumir", "desativar item", "nao cobrar", "tirar do total", "remover do total", "item"],
    a: "Cada item tem um ícone de olho. Ao clicar nele, o item some da proposta do cliente e sai do total, mas continua no seu editor para você reativar quando quiser." },
  { id: "datas", cat: "Campos", q: "Para que servem Início e Entrega?", kw: ["data", "datas", "inicio", "comeco", "entrega", "prazo", "cronograma"],
    a: "São as datas de início e de entrega do trabalho. Você pode escrever à vontade, por exemplo \"10 de agosto\". Se preencher, elas aparecem na proposta." },
  { id: "condicoes", cat: "Campos", q: "Pagamento, Revisões e Validade, o que é?", kw: ["forma de pagamento", "revisoes", "revisao", "validade", "vencimento", "condicoes", "termos", "garantia", "parcelas"],
    a: "São as condições do trabalho: como o cliente paga (ex: 50% na aprovação), quantas revisões estão inclusas e por quantos dias a proposta vale. Todos são opcionais." },
  { id: "bio", cat: "Campos", q: "O que é o \"Sobre mim\"?", kw: ["sobre mim", "bio", "apresentacao", "quem sou", "sobre voce", "texto padrao", "padrao"],
    a: "É uma breve apresentação sua que aparece na proposta. Em Configurações > Padrões da proposta você salva um texto padrão que entra em toda proposta nova sozinho." },

  // ── Aparência ──────────────────────────────────────────────────────────────
  { id: "modelo", cat: "Aparência", q: "Como trocar o modelo (template)?", kw: ["modelo", "modelos", "template", "templates", "design", "layout", "estilo", "trocar", "mudar aparencia"],
    a: "No editor, em \"Modelo da proposta\", clique no design que quiser. A aba Templates mostra todos com prévia. Alguns são exclusivos do Pro e aparecem com cadeado." },
  { id: "cor", cat: "Aparência", q: "Como mudar a cor da proposta?", kw: ["cor", "cores", "destaque", "accent", "tom", "pintar", "personalizar cor", "paleta", "hex"],
    a: "Em \"Cor de destaque\", escolha uma cor pronta, digite o código hex ou clique em \"Surpreenda-me\". Ela pinta o título, os realces e o botão do template." },
  { id: "gradiente", cat: "Aparência", q: "Como usar gradiente?", kw: ["gradiente", "degrade", "duas cores", "segunda cor", "transicao de cor"],
    a: "Ligue o interruptor \"Usar gradiente\" e escolha a segunda cor. O gradiente aparece nos modelos Bold, Colorido e Aurora." },
  { id: "tema", cat: "Aparência", q: "O que é o Tema de fundo?", kw: ["tema", "fundo", "claro", "creme", "escuro", "modo escuro", "dark", "plano de fundo", "background"],
    a: "Troca a base do template entre Claro, Creme e Escuro, sempre mantendo a leitura fácil. A sua cor de destaque continua no título e nos realces." },
  { id: "marcadagua", cat: "Aparência", q: "Como controlar a marca d'água?", kw: ["marca dagua", "marca d agua", "letra", "fundo", "watermark", "grande"],
    a: "Disponível no template Grande. Você escolhe entre Automática (a inicial do cliente ou da empresa), Uma letra (você digita qual) ou Nenhuma. A escolha fica salva na proposta." },
  { id: "logo", cat: "Aparência", q: "Como colocar minha logo?", kw: ["logo", "logotipo", "marca", "minha marca", "simbolo", "imagem", "upload", "enviar logo"],
    a: "Em \"Logo\", clique em \"Enviar sua logo\". Use uma imagem quadrada (ideal 400x400 px), PNG ou JPG, de até 2 MB. Ela entra no lugar do \"M\" na proposta." },
  { id: "capa", cat: "Aparência", q: "Como usar uma foto de capa?", kw: ["capa", "foto", "cover", "banner", "imagem de topo", "imagem de fundo", "dossie"],
    a: "Nos modelos Capa e Dossiê você pode enviar uma imagem de capa (ideal 1600x600 px, até 2 MB). Sem foto, ele usa um fundo na sua cor de destaque." },

  // ── Calculadora ────────────────────────────────────────────────────────────
  { id: "calc", cat: "Calculadora", q: "Como funciona a calculadora de preço?", kw: ["calculadora", "calcular", "preco", "precificar", "quanto cobrar", "quanto vale", "cobrar", "orcar", "cotar", "estimar", "valor"],
    a: "Na aba Calculadora (ou no botão \"Calcular preço\" do editor) você monta o preço a partir dos seus custos: deslocamento, ferramentas, horas, dificuldade, margem e impostos. Tem também uma aba com faixas de mercado por nicho." },
  { id: "calc-salvo", cat: "Calculadora", q: "A calculadora salva meus dados?", kw: ["calculadora", "salva", "ferramentas", "valor da hora", "guarda", "mantem", "perde"],
    a: "Salva sim, no seu navegador. Suas ferramentas, valor da hora, margem e impostos ficam guardados para a próxima vez. Se quiser recomeçar, use o \"Limpar tudo\"." },

  // ── Clientes e acompanhamento ──────────────────────────────────────────────
  { id: "clientes", cat: "Acompanhamento", q: "Para que serve a aba Clientes?", kw: ["aba clientes", "painel", "dashboard", "relatorio", "metricas", "receita", "faturamento", "conversao", "kpi", "resumo", "acompanhar"],
    a: "A aba Clientes junta suas propostas por cliente e mostra os números do período: receita, valor em aberto, quantas foram enviadas e a conversão. Clique num cliente para ver as propostas dele, copiar link e baixar PDF." },
  { id: "viu", cat: "Acompanhamento", q: "Como sei se o cliente abriu a proposta?", kw: ["abriu", "abertura", "aberto", "visualizou", "visualizacao", "viu", "olhou", "olhar", "acessou", "recebeu", "chegou", "leu", "rastreio", "notificacao"],
    a: "Você recebe uma notificação quando o cliente abre o link e outra quando ele aceita. Fica tudo na aba Notificações, com data e hora." },
  { id: "aceite", cat: "Acompanhamento", q: "Como o cliente aceita a proposta?", kw: ["aceitar", "aceite", "aprovar", "aprovou", "assinou", "fechar negocio", "fechou", "confirmar"],
    a: "No próprio link, o cliente clica em \"Aceitar proposta\". O aceite fica registrado com data e hora, sem precisar de contrato à parte, e você é avisado na hora." },
  { id: "notificacoes", cat: "Acompanhamento", q: "Como gerenciar as notificações?", kw: ["notificacao", "notificacoes", "avisos", "alertas", "sino", "lida", "excluir", "limpar", "buscar"],
    a: "Na aba Notificações você pode buscar, marcar como lida ou não lida e excluir as selecionadas ou todas. O que você exclui não volta." },

  // ── Configurações e conta ──────────────────────────────────────────────────
  { id: "nome", cat: "Conta", q: "Como mudar meu nome de exibição?", kw: ["nome", "exibicao", "perfil", "apelido", "trocar nome", "editar nome"],
    a: "Em Configurações > Perfil, edite o campo \"Nome de exibição\" e salve. É o nome que os seus clientes veem." },
  { id: "senha", cat: "Conta", q: "Como trocar minha senha?", kw: ["senha", "trocar senha", "mudar senha", "nova senha", "alterar senha", "seguranca", "codigo"],
    a: "Em Configurações > Segurança: digite a nova senha, clique em \"Enviar código\", informe o código de 6 dígitos que chega no seu e-mail e confirme." },
  { id: "esqueci", cat: "Conta", q: "Esqueci minha senha, e agora?", kw: ["esqueci", "nao lembro", "recuperar", "redefinir", "reset", "resetar", "perdi a senha", "perdi acesso"],
    a: "Na tela de login, clique em \"Esqueci a senha\" e digite seu e-mail. Chega um código: com ele você já entra e depois troca a senha em Configurações." },
  { id: "google", cat: "Conta", q: "Posso entrar com o Google?", kw: ["google", "gmail", "entrar com google", "login google", "conta google", "sso", "cpf"],
    a: "Pode. No primeiro acesso pelo Google, pedimos seu CPF uma única vez (uma conta por CPF). Depois é só clicar em \"Entrar com Google\"." },

  // ── Plano e cobrança ───────────────────────────────────────────────────────
  { id: "cota", cat: "Plano", q: "Qual o limite de propostas do meu plano?", kw: ["limite", "limite mensal", "cota", "quota", "quantas propostas", "quantas posso", "restantes", "esgotou", "acabou"],
    a: "Básico: 5 propostas por mês. Pro: 25 por mês. Business: ilimitado. Rascunhos não contam, só as concluídas. Você acompanha o quanto já usou em Configurações > Plano e uso." },
  { id: "templates-plano", cat: "Plano", q: "Por que alguns templates estão bloqueados?", kw: ["template", "bloqueado", "travado", "cadeado", "pro", "premium", "liberar", "desbloquear", "plano"],
    a: "No Básico você usa os modelos Minimal e Bold. Os outros são do Pro e do Business e aparecem com cadeado; clicar neles leva para os planos." },
  { id: "pagamento-plano", cat: "Plano", q: "Como pago o plano? Aceita Pix?", kw: ["pagar", "pagamento", "pix", "cartao", "boleto", "assinar", "assinatura", "mensalidade", "cobranca"],
    a: "O pagamento é pelo Mercado Pago e você escolhe na hora entre Pix, cartão ou boleto. No Pix, o acesso libera assim que o pagamento é confirmado." },
  { id: "cancelar", cat: "Plano", q: "Como cancelo o plano?", kw: ["cancelar", "cancelamento", "encerrar", "parar", "desassinar", "sair do plano", "reembolso", "renovar", "renovacao"],
    a: "Não tem fidelidade nem cobrança automática: você paga por período (mês ou ano) e o acesso não renova sozinho. Para cancelar, é só não renovar. Para continuar, renove em Configurações > Plano e uso quando chegar perto do fim." },
];

// Perguntas de partida mostradas quando o chat abre.
export const SUPPORT_STARTERS = ["criar", "concluir", "viu", "cota", "cor", "calc"];

const norm = (s) => String(s || "").toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "") // tira acentos
  .replace(/[^a-z0-9\s]/g, " ")
  .replace(/\s+/g, " ").trim();

const STOP = new Set(["o", "a", "os", "as", "de", "do", "da", "dos", "das", "e", "em", "no", "na", "nos", "nas",
  "um", "uma", "para", "pra", "por", "com", "sem", "que", "qual", "quais", "como", "onde", "quando", "meu", "minha",
  "meus", "minhas", "seu", "sua", "eu", "voce", "ele", "ela", "isso", "esse", "essa", "the", "of", "to", "é", "e",
  "ser", "estar", "tem", "ter", "faz", "fazer", "pode", "posso", "quero", "preciso", "ajuda", "duvida", "sobre", "aqui"]);

// Palavras que aparecem em quase toda pergunta do Manda. Contam pouco, para não
// puxar a resposta errada só por serem genéricas (ex: "cliente", "proposta").
const GENERIC = new Set(["cliente", "clientes", "proposta", "propostas", "orcamento", "orcamentos", "manda"]);

// Busca os tópicos mais relevantes para a pergunta do usuário.
export function searchSupport(query) {
  const q = norm(query);
  if (!q) return { best: null, related: [] };
  const tokens = q.split(" ").filter((t) => t.length > 1 && !STOP.has(t));
  if (!tokens.length) return { best: null, related: [] };

  const scored = SUPPORT_TOPICS.map((t) => {
    const kw = (t.kw || []).map(norm);
    const hayQ = norm(t.q);
    const hayA = norm(t.a);
    let score = 0;
    for (const tok of tokens) {
      let s = 0;
      if (kw.some((k) => k === tok)) s += 3;             // palavra-chave exata
      else if (kw.some((k) => k.includes(tok) || tok.includes(k))) s += 2; // parcial
      if (hayQ.includes(tok)) s += 2;                    // aparece na pergunta
      else if (hayA.includes(tok)) s += 1;               // aparece na resposta
      if (GENERIC.has(tok)) s = Math.min(s, 1);          // genérica pesa pouco
      score += s;
    }
    // frase inteira da pergunta bate muito
    if (hayQ.includes(q)) score += 4;
    return { t, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);

  if (!scored.length) return { best: null, related: [] };
  const top = scored[0];
  // Confiança mínima: se muito baixa, trata como "não achei" e sugere.
  const confident = top.score >= 3;
  return {
    best: confident ? top.t : null,
    related: scored.slice(confident ? 1 : 0, confident ? 4 : 3).map((x) => x.t),
  };
}

export const topicById = (id) => SUPPORT_TOPICS.find((t) => t.id === id) || null;
