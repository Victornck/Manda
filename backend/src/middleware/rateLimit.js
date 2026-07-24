import rateLimit from "express-rate-limit";

// Camadas de rate limit por superfície de ataque. Todos por IP (trust proxy=1
// no server.js garante o IP real atrás de proxy). As mensagens usam a chave
// "error" porque é o que o front lê e mostra.

// Teto geral da API: segura scraping/flood básicos sem atrapalhar uso normal.
export const generalLimiter = rateLimit({
  windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false,
  message: { error: "Muitas requisições. Aguarde um instante." },
});

// Cadastro e login com Google: criação de conta em massa.
export const authLimiter = rateLimit({
  windowMs: 15 * 60_000, max: 20, standardHeaders: true, legacyHeaders: false,
  message: { error: "Muitas tentativas. Tente novamente mais tarde." },
});

// Login com senha: força bruta. Só conta tentativa FALHA (quem acerta não gasta
// cota), então usuário legítimo nunca se tranca sozinho.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60_000, max: 10, standardHeaders: true, legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Muitas tentativas de login. Aguarde 15 minutos ou use “Esqueci a senha”." },
});

// Endpoints que DISPARAM EMAIL (esqueci a senha / código de troca): cada
// requisição custa um envio. Bem apertado; há também cooldown por conta no banco.
export const emailLimiter = rateLimit({
  windowMs: 15 * 60_000, max: 5, standardHeaders: true, legacyHeaders: false,
  message: { error: "Muitos pedidos de código. Aguarde alguns minutos." },
});

// Verificação de código (reset/troca): além das 5 tentativas por código no
// banco, limita por IP para frear robôs alternando emails.
export const codeLimiter = rateLimit({
  windowMs: 15 * 60_000, max: 15, standardHeaders: true, legacyHeaders: false,
  message: { error: "Muitas tentativas. Aguarde alguns minutos e peça um novo código." },
});

// Página pública da proposta (view/accept/decline): evita enumeração de links
// e spam de eventos/notificações no dono da proposta.
export const publicLimiter = rateLimit({
  windowMs: 60_000, max: 30, standardHeaders: true, legacyHeaders: false,
  message: { error: "Muitas requisições. Aguarde um instante." },
});

// Stripe (checkout/portal): cada chamada cria sessão no Stripe. Sem motivo
// legítimo para dezenas por minuto.
export const billingLimiter = rateLimit({
  windowMs: 15 * 60_000, max: 10, standardHeaders: true, legacyHeaders: false,
  message: { error: "Muitas tentativas. Aguarde um instante e tente de novo." },
});

// Escrita de propostas (criar/editar): corpo de até 3MB (imagens base64);
// flood disso pesa banco e banda. Uso normal fica muito abaixo.
export const writeLimiter = rateLimit({
  windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false,
  message: { error: "Muitas operações seguidas. Aguarde um instante." },
});
