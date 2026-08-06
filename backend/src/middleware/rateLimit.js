import rateLimit from "express-rate-limit";
import { verifyToken } from "../lib/jwt.js";

// Camadas de rate limit por superfície de ataque. Os limitadores específicos
// (login, e-mail, cobrança) são por IP — o certo pra ataque não autenticado. O
// `trust proxy=1` no app.js garante o IP real do cliente atrás do Caddy. As
// mensagens usam a chave "error" porque é o que o front lê e mostra.

// Chave do teto geral: usa o ID do usuário quando a requisição está autenticada
// (Bearer válido), senão o IP real. Assim dois usuários atrás do MESMO IP/NAT
// (ex.: um Wi-Fi de casa ou escritório) não dividem o contador, e um F5 exagerado
// de uma pessoa nunca bloqueia as outras.
function keyByUserOrIp(req) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (token) {
    try {
      const p = verifyToken(token);
      if (p?.sub) return `u:${p.sub}`;
    } catch { /* token inválido/expirado: cai para o IP */ }
  }
  return `ip:${req.ip}`;
}

// Teto geral da API (só em /api — nunca na frente do HTML/assets, veja app.js).
// Alto o suficiente pra uma sessão real de SPA (que faz várias chamadas por tela),
// baixo o suficiente pra frear scraping/flood.
export const generalLimiter = rateLimit({
  windowMs: 60_000, max: 300, standardHeaders: true, legacyHeaders: false, skip: () => process.env.NODE_ENV === "test",
  keyGenerator: keyByUserOrIp,
  message: { error: "Muitas requisições. Aguarde um instante." },
});

// Cadastro e login com Google: criação de conta em massa.
export const authLimiter = rateLimit({
  windowMs: 15 * 60_000, max: 20, standardHeaders: true, legacyHeaders: false, skip: () => process.env.NODE_ENV === "test",
  message: { error: "Muitas tentativas. Tente novamente mais tarde." },
});

// Login com senha: força bruta. Só conta tentativa FALHA (quem acerta não gasta
// cota), então usuário legítimo nunca se tranca sozinho.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60_000, max: 10, standardHeaders: true, legacyHeaders: false, skip: () => process.env.NODE_ENV === "test",
  skipSuccessfulRequests: true,
  message: { error: "Muitas tentativas de login. Aguarde 15 minutos ou use “Esqueci a senha”." },
});

// Endpoints que DISPARAM EMAIL (esqueci a senha / código de troca): cada
// requisição custa um envio. Bem apertado; há também cooldown por conta no banco.
export const emailLimiter = rateLimit({
  windowMs: 15 * 60_000, max: 5, standardHeaders: true, legacyHeaders: false, skip: () => process.env.NODE_ENV === "test",
  message: { error: "Muitos pedidos de código. Aguarde alguns minutos." },
});

// Verificação de código (reset/troca): além das 5 tentativas por código no
// banco, limita por IP para frear robôs alternando emails.
export const codeLimiter = rateLimit({
  windowMs: 15 * 60_000, max: 15, standardHeaders: true, legacyHeaders: false, skip: () => process.env.NODE_ENV === "test",
  message: { error: "Muitas tentativas. Aguarde alguns minutos e peça um novo código." },
});

// Página pública da proposta (view/accept/decline): evita enumeração de links
// e spam de eventos/notificações no dono da proposta.
export const publicLimiter = rateLimit({
  windowMs: 60_000, max: 30, standardHeaders: true, legacyHeaders: false, skip: () => process.env.NODE_ENV === "test",
  message: { error: "Muitas requisições. Aguarde um instante." },
});

// Cobrança (Mercado Pago): cada chamada cria uma preferência de checkout. Sem
// motivo legítimo para dezenas por minuto.
export const billingLimiter = rateLimit({
  windowMs: 15 * 60_000, max: 10, standardHeaders: true, legacyHeaders: false, skip: () => process.env.NODE_ENV === "test",
  message: { error: "Muitas tentativas. Aguarde um instante e tente de novo." },
});

// Envio de proposta por e-mail (Gmail API): cada chamada dispara um e-mail real.
// Uso normal é baixo (algumas por dia); trava flood sem atrapalhar.
export const emailSendLimiter = rateLimit({
  windowMs: 60_000, max: 12, standardHeaders: true, legacyHeaders: false, skip: () => process.env.NODE_ENV === "test",
  message: { error: "Muitos envios seguidos. Aguarde um instante." },
});

// Relatar problema: cada envio grava no banco e dispara um e-mail pro suporte.
// Uso legítimo é raro (uma pessoa relatando algo), então trava spam sem incomodar.
export const feedbackLimiter = rateLimit({
  windowMs: 15 * 60_000, max: 6, standardHeaders: true, legacyHeaders: false, skip: () => process.env.NODE_ENV === "test",
  message: { error: "Muitos relatos seguidos. Aguarde alguns minutos." },
});

// Escrita de propostas (criar/editar): corpo de até 3MB (imagens base64);
// flood disso pesa banco e banda. Uso normal fica muito abaixo.
export const writeLimiter = rateLimit({
  windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false, skip: () => process.env.NODE_ENV === "test",
  message: { error: "Muitas operações seguidas. Aguarde um instante." },
});
