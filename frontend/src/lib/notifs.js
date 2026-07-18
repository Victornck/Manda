// Notificações ficam SÓ no localStorage, e agora ESCOPADAS por usuário (scope),
// para não vazar entre contas no mesmo navegador. O backend só serve para
// DESCOBRIR interações do cliente; o que chega é mesclado no store local.
const KEY = "manda_notifs";
const SEEN = "manda_notifs_seen";
const CAP = 100; // guarda no máximo as 100 mais recentes
const k = (base, scope) => `${base}:${scope || "anon"}`;

export function loadNotifs(scope) {
  try {
    const raw = localStorage.getItem(k(KEY, scope));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function save(scope, list) {
  try { localStorage.setItem(k(KEY, scope), JSON.stringify(list.slice(0, CAP))); } catch { /* modo privado / cheio: ignora */ }
}

const sortDesc = (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

// Mescla novas notificações (dedupe por id). Retorna { list, added }.
export function mergeNotifs(scope, incoming) {
  const list = loadNotifs(scope);
  const known = new Set(list.map((n) => n.id));
  const added = (incoming || []).filter((n) => n && n.id && !known.has(n.id));
  if (!added.length) return { list, added: [] };
  const merged = [...added, ...list].sort(sortDesc).slice(0, CAP);
  save(scope, merged);
  return { list: merged, added };
}

export function getSeen(scope) {
  try { return Number(localStorage.getItem(k(SEEN, scope))) || 0; } catch { return 0; }
}
export function setSeen(scope, ts) {
  try { localStorage.setItem(k(SEEN, scope), String(ts)); } catch { /* ignore */ }
}
