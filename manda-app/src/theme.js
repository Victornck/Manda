// Tokens de design do Manda — um lugar só pra cor, fonte e sombra.
// Antes cada cor estava hardcoded dezenas de vezes; agora muda aqui e reflete em tudo.

export const font = {
  heading: "'Satoshi', system-ui, sans-serif",
  body: "'General Sans', system-ui, sans-serif",
};

export const color = {
  ink: "#0A0A0A",
  ink900: "#18181B",
  ink800: "#27272A",
  gray700: "#3F3F46",
  gray600: "#52525B",
  gray500: "#71717A",
  gray400: "#A1A1AA",
  gray300: "#D4D4D8",
  gray200: "#E4E4E7",
  line: "#EAEAEA",
  line2: "#ECECEC",
  line3: "#EFEFEF",
  surface: "#F4F4F5",
  surface2: "#F9FAFB",
  surface3: "#FAFAFA",
  white: "#FFFFFF",

  // Marca
  accent: "#D97757",
  accentHover: "#C25E3F",
  accentInk: "#B75C3C",
  accentTint: "#FDF4F0",
  accentGlow: "#FBEDE7",
  accentLine: "#F1D9CE",

  // Degradê escuro (heros / CTA)
  darkGradient: "radial-gradient(120% 140% at 12% 0%,#2A1712 0%,#0A0A0A 62%)",
};

// Cores de status usadas nos badges de proposta
export const statusColors = {
  Rascunho: { c: "#52525B", bg: "#F4F4F5", b: "#E4E4E7" },
  Enviada: { c: "#3A5BB5", bg: "#EEF2FB", b: "#D6E0F5" },
  Visualizada: { c: "#B75C3C", bg: "#FDF4F0", b: "#F1D9CE" },
  Aceita: { c: "#2E7D51", bg: "#EAF5EE", b: "#C9E7D5" },
  Recusada: { c: "#B4443C", bg: "#FDECEA", b: "#F5D2CD" },
};

// Paleta de avatares (rotaciona por índice)
export const avatarPalette = [
  { bg: "#FDF4F0", ink: "#B75C3C" },
  { bg: "#EEF2FB", ink: "#3A5BB5" },
  { bg: "#EAF5EE", ink: "#2E7D51" },
  { bg: "#F5EFFB", ink: "#6C48B0" },
];

export const shadow = {
  sm: "0 1px 2px rgba(0,0,0,0.08)",
  card: "0 12px 40px -16px rgba(20,20,30,0.16)",
  float: "0 24px 60px -20px rgba(20,20,30,0.22),0 8px 20px -12px rgba(20,20,30,0.12)",
  modal: "0 30px 70px -20px rgba(0,0,0,0.4)",
};

// Formata número para R$ pt-BR
export const brl = (n) => "R$ " + (Number(n) || 0).toLocaleString("pt-BR");

// Iniciais de um nome
export const initials = (name = "") =>
  name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
