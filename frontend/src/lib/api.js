// Cliente da API do backend (Node/Express).
//
// COMO LIGAR O FRONT AO BACKEND (quando o servidor estiver no ar):
// 1. Crie frontend/.env com:  VITE_API_URL=http://localhost:4000/api
// 2. No login/cadastro (Auth.jsx): troque signInWithPassword/signUp por
//    api.login/api.register e guarde o token com setToken(res.token).
// 3. No Dashboard: troque loadProposals/upsertProposal/removeProposal (drafts.js)
//    por api.listProposals/createProposal/updateProposal/setStatus/deleteProposal
//    e getCurrentUser por api.me.
// 4. No PublicProposal.jsx: troque decodeProposal(token) por api.publicProposal(id)
//    e onAccept por api.acceptPublic(id). O link vira /p/<publicId> curto.
//
// Até fazer isso, o app segue no modo local (localStorage). Nada quebra.

const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const TOKEN_KEY = "manda_token";
const TOKEN_DAYS = 7; // acompanha o JWT_EXPIRES do backend

// O token de sessão vive num COOKIE (não em localStorage): limpar os cookies
// do navegador desloga de verdade. O cookie expira junto com o JWT.
const readCookie = () => {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${TOKEN_KEY}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : null;
  } catch { return null; }
};

export function setToken(t) {
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    if (t) document.cookie = `${TOKEN_KEY}=${encodeURIComponent(t)}; path=/; max-age=${TOKEN_DAYS * 86400}; SameSite=Lax${secure}`;
    else document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax${secure}`;
  } catch { /* ignore */ }
}

export function getToken() {
  const fromCookie = readCookie();
  if (fromCookie) return fromCookie;
  // Migração única: sessões antigas guardavam o token em localStorage.
  // Move para cookie e apaga o rastro para que limpar cookies deslogue.
  try {
    const legacy = localStorage.getItem(TOKEN_KEY);
    if (legacy) {
      localStorage.removeItem(TOKEN_KEY);
      setToken(legacy);
      return legacy;
    }
  } catch { /* ignore */ }
  return null;
}

// Sessão morta (cookie removido/expirado, token inválido): limpa tudo e volta
// pro login. Nos endpoints de login o 401 é "credencial errada", não sessão.
const AUTH_401_OK = ["/auth/login", "/auth/google", "/auth/register", "/auth/reset"];

async function request(path, options = {}) {
  const token = getToken();
  let res;
  try {
    res = await fetch(BASE + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    // fetch rejeita quando não há conexão / servidor fora do ar.
    const err = new Error("Sem conexão com o servidor.");
    err.network = true;
    throw err;
  }
  if (res.status === 401 && !AUTH_401_OK.some((p) => path.startsWith(p))) {
    setToken(null);
    if (window.location.pathname.startsWith("/app")) window.location.assign("/entrar");
    throw new Error("Sessão expirada. Entre de novo.");
  }
  if (res.status === 204) return {};
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Falha na requisição.");
    err.status = res.status;
    err.data = data;
    if (data.needsConnect) err.needsConnect = true; // ex.: enviar sem Gmail conectado
    throw err;
  }
  return data;
}

export const api = {
  // auth
  register: (body) => request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body) => request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  googleAuth: (body) => request("/auth/google", { method: "POST", body: JSON.stringify(body) }),
  me: () => request("/auth/me"),
  updateProfile: (body) => request("/auth/profile", { method: "PATCH", body: JSON.stringify(body) }),
  // Esqueci a senha (deslogado): pede código por email; o código correto LOGA
  // (devolve token + user). A troca de senha em si acontece em Configurações.
  forgotPassword: (email) => request("/auth/forgot", { method: "POST", body: JSON.stringify({ email }) }),
  resetLogin: (body) => request("/auth/reset", { method: "POST", body: JSON.stringify(body) }), // { email, code } → { token, user }
  // Troca de senha no painel (logado): pede código para o próprio email, depois valida.
  requestPasswordCode: () => request("/auth/password/request-code", { method: "POST" }),
  changePassword: (body) => request("/auth/password", { method: "POST", body: JSON.stringify(body) }), // { code, next }
  notifications: () => request("/proposals/notifications"),

  // propostas (exigem token)
  listProposals: () => request("/proposals"),
  createProposal: (body) => request("/proposals", { method: "POST", body: JSON.stringify(body) }),
  getProposal: (id) => request(`/proposals/${id}`),
  updateProposal: (id, body) => request(`/proposals/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  setStatus: (id, status) => request(`/proposals/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  deleteProposal: (id) => request(`/proposals/${id}`, { method: "DELETE" }),
  stats: () => request("/proposals/stats"),
  usage: () => request("/proposals/usage"),
  // Envia a proposta pelo Gmail do usuário. body: { to?, subject?, message? }.
  // 409 com { needsConnect:true } quando falta conectar a conta Google.
  sendProposalEmail: (id, body) => request(`/proposals/${id}/send-email`, { method: "POST", body: JSON.stringify(body || {}) }),

  // Integração Gmail (enviar propostas pelo próprio e-mail)
  gmailStatus: () => request("/integrations/google/status"),
  gmailConnectUrl: () => request("/integrations/google/connect"), // { url } — abrir no navegador
  gmailDisconnect: () => request("/integrations/google", { method: "DELETE" }),

  // público (sem token)
  publicProposal: (publicId) => request(`/public/${publicId}`),
  viewPublic: (publicId) => request(`/public/${publicId}/view`, { method: "POST" }),
  acceptPublic: (publicId) => request(`/public/${publicId}/accept`, { method: "POST" }),
  declinePublic: (publicId) => request(`/public/${publicId}/decline`, { method: "POST" }),

  // cobrança (Mercado Pago). checkout devolve { url } — redirecione com window.location = url.
  checkout: (plan, interval = "month") => request("/billing/checkout", { method: "POST", body: JSON.stringify({ plan, interval }) }),
};
