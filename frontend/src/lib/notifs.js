// Notificações ficam SÓ no localStorage. Como podem representar muitos tipos de
// evento (cliente visualizou/aceitou/recusou, ações locais, etc.), guardamos
// tudo aqui. O backend só serve para DESCOBRIR interações do cliente; quando
// aparecem, são mescladas neste store (deduplicadas por id).
const KEY = "manda_notifs";
const SEEN = "manda_notifs_seen";
const CAP = 100; // guarda no máximo as 100 mais recentes

export function loadNotifs() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function save(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, CAP))); } catch { /* modo privado / cheio: ignora */ }
}

const sortDesc = (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

// Mescla novas notificações (dedupe por id). Retorna { list, added }.
export function mergeNotifs(incoming) {
  const list = loadNotifs();
  const known = new Set(list.map((n) => n.id));
  const added = (incoming || []).filter((n) => n && n.id && !known.has(n.id));
  if (!added.length) return { list, added: [] };
  const merged = [...added, ...list].sort(sortDesc).slice(0, CAP);
  save(merged);
  return { list: merged, added };
}

// Adiciona uma notificação local (ação do próprio usuário, por exemplo).
export function addNotif(n) {
  const item = {
    id: n.id || `l_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: n.createdAt || new Date().toISOString(),
    ...n,
  };
  return mergeNotifs([item]);
}

export function getSeen() {
  try { return Number(localStorage.getItem(SEEN)) || 0; } catch { return 0; }
}
export function setSeen(ts) {
  try { localStorage.setItem(SEEN, String(ts)); } catch { /* ignore */ }
}
