// Base de referência para a Calculadora de preço.
//
// IMPORTANTE: são FAIXAS DE MERCADO, um ponto de partida para você não chutar,
// não uma tabela oficial. Variam muito por região, experiência e nicho. Os
// valores estão em reais e representam o mercado freelancer brasileiro.
// min = piso comum · typ = valor típico · max = topo comum.

export const PRICE_TABLE = [
  {
    cat: "Vídeo",
    services: [
      { name: "Vídeo institucional (até 90s)", min: 1500, typ: 3200, max: 7000, unit: "projeto" },
      { name: "Vídeo para redes (reels/short)", min: 250, typ: 600, max: 1500, unit: "vídeo" },
      { name: "Diária de gravação", min: 800, typ: 1600, max: 3500, unit: "diária" },
      { name: "Edição de vídeo", min: 300, typ: 800, max: 2200, unit: "vídeo" },
      { name: "Motion graphics / animação", min: 700, typ: 1800, max: 5000, unit: "projeto" },
    ],
  },
  {
    cat: "Design & Identidade",
    services: [
      { name: "Logo (marca simples)", min: 400, typ: 1200, max: 3500, unit: "projeto" },
      { name: "Identidade visual completa", min: 1500, typ: 3500, max: 9000, unit: "projeto" },
      { name: "Post para redes sociais", min: 40, typ: 90, max: 200, unit: "arte" },
      { name: "Apresentação / pitch deck", min: 400, typ: 1000, max: 2800, unit: "projeto" },
      { name: "Material gráfico (flyer, cartão)", min: 120, typ: 300, max: 700, unit: "peça" },
    ],
  },
  {
    cat: "Social Media",
    services: [
      { name: "Gestão de redes (mensal)", min: 800, typ: 1800, max: 4500, unit: "mês" },
      { name: "Planejamento de conteúdo (mensal)", min: 500, typ: 1200, max: 3000, unit: "mês" },
      { name: "Gestão de tráfego pago (mensal)", min: 900, typ: 2000, max: 5000, unit: "mês" },
      { name: "Calendário editorial", min: 300, typ: 700, max: 1800, unit: "projeto" },
    ],
  },
  {
    cat: "Desenvolvimento",
    services: [
      { name: "Landing page", min: 900, typ: 2500, max: 6000, unit: "projeto" },
      { name: "Site institucional", min: 2000, typ: 5000, max: 15000, unit: "projeto" },
      { name: "Loja virtual (e-commerce)", min: 3500, typ: 8000, max: 25000, unit: "projeto" },
      { name: "Hora de desenvolvimento", min: 60, typ: 120, max: 300, unit: "hora" },
      { name: "Manutenção mensal", min: 300, typ: 800, max: 2500, unit: "mês" },
    ],
  },
  {
    cat: "Fotografia",
    services: [
      { name: "Ensaio (retrato / pessoal)", min: 350, typ: 800, max: 2000, unit: "ensaio" },
      { name: "Fotografia de produto", min: 20, typ: 60, max: 150, unit: "foto" },
      { name: "Cobertura de evento", min: 600, typ: 1500, max: 4000, unit: "evento" },
      { name: "Diária de fotografia", min: 700, typ: 1400, max: 3200, unit: "diária" },
    ],
  },
  {
    cat: "Texto & Conteúdo",
    services: [
      { name: "Artigo / blog post", min: 120, typ: 350, max: 900, unit: "texto" },
      { name: "Copywriting (página de venda)", min: 500, typ: 1500, max: 4000, unit: "projeto" },
      { name: "Roteiro para vídeo", min: 200, typ: 500, max: 1500, unit: "roteiro" },
      { name: "Revisão de texto", min: 30, typ: 60, max: 120, unit: "lauda" },
    ],
  },
  {
    cat: "Consultoria",
    services: [
      { name: "Hora de consultoria", min: 100, typ: 250, max: 600, unit: "hora" },
      { name: "Mentoria (pacote mensal)", min: 500, typ: 1200, max: 3500, unit: "mês" },
      { name: "Diagnóstico / auditoria", min: 400, typ: 1000, max: 3000, unit: "projeto" },
    ],
  },
];

// Fatores que ajustam a sugestão. Multiplicadores aplicados sobre a faixa.
export const COMPLEXITY = [
  { key: "simples", label: "Simples", mult: 0.8, hint: "Escopo enxuto, poucas entregas" },
  { key: "media", label: "Média", mult: 1.0, hint: "Escopo padrão do serviço" },
  { key: "alta", label: "Alta", mult: 1.35, hint: "Muitas entregas, cliente exigente" },
];
export const URGENCY = [
  { key: "normal", label: "Prazo normal", mult: 1.0 },
  { key: "urgente", label: "Urgente", mult: 1.4 },
];

export const fmtBRL = (v) =>
  "R$ " + new Intl.NumberFormat("pt-BR").format(Math.max(0, Math.round(v)));

// ── Calculadora "monta seu preço" (custo + margem) ──────────────────────────
export const DEFAULT_CONSUMO = 11; // km por litro (carro popular médio)

// Multiplicador da mão de obra conforme a dificuldade do projeto.
export const PROJECT_DIFFICULTY = [
  { key: "simples", label: "Simples", mult: 1.0, hint: "Trabalho tranquilo, já domino" },
  { key: "media", label: "Média", mult: 1.25, hint: "Padrão, com alguns desafios" },
  { key: "alta", label: "Alta", mult: 1.6, hint: "Complexo ou cliente exigente" },
  { key: "muito", label: "Muito alta", mult: 2.1, hint: "Raro, muito difícil ou arriscado" },
];

// Calcula a faixa e o valor sugerido para um serviço com os fatores escolhidos.
export function suggest(service, complexityMult = 1, urgencyMult = 1) {
  const f = complexityMult * urgencyMult;
  const round = (v) => Math.round((v * f) / 10) * 10; // arredonda para a dezena
  return {
    min: round(service.min),
    typ: round(service.typ),
    max: round(service.max),
    unit: service.unit,
  };
}
