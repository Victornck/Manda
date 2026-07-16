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

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(t) {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (res.status === 204) return {};
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Falha na requisição.");
  return data;
}

export const api = {
  // auth
  register: (body) => request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body) => request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => request("/auth/me"),

  // propostas (exigem token)
  listProposals: () => request("/proposals"),
  createProposal: (body) => request("/proposals", { method: "POST", body: JSON.stringify(body) }),
  getProposal: (id) => request(`/proposals/${id}`),
  updateProposal: (id, body) => request(`/proposals/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  setStatus: (id, status) => request(`/proposals/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  deleteProposal: (id) => request(`/proposals/${id}`, { method: "DELETE" }),
  stats: () => request("/proposals/stats"),

  // público (sem token)
  publicProposal: (publicId) => request(`/public/${publicId}`),
  acceptPublic: (publicId) => request(`/public/${publicId}/accept`, { method: "POST" }),
  declinePublic: (publicId) => request(`/public/${publicId}/decline`, { method: "POST" }),

  // cobrança (Stripe). checkout/portal devolvem { url } — redirecione com window.location = url
  checkout: (plan, interval = "month") => request("/billing/checkout", { method: "POST", body: JSON.stringify({ plan, interval }) }),
  billingPortal: () => request("/billing/portal", { method: "POST" }),
};
