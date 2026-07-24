// Notificações ficam SÓ no localStorage, e agora ESCOPADAS por usuário (scope),
// para não vazar entre contas no mesmo navegador. O backend só serve para
// DESCOBRIR interações do cliente; o que chega é mesclado no store local.
const KEY = "manda_notifs";
const SEEN = "manda_notifs_seen";
const READ = "manda_notifs_read"; // ids marcados como lidos (por usuário)
const DEL = "manda_notifs_del";   // "lápides": ids excluídos NUNCA voltam do servidor
const CAP = 100; // guarda no máximo as 100 mais recentes
const k = (base, scope) => `${base}:${scope || "anon"}`;

const loadSet = (base, scope) => {
  try {
    const raw = localStorage.getItem(k(base, scope));
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch { return new Set(); }
};
const saveSet = (base, scope, set, cap = 400) => {
  try { localStorage.setItem(k(base, scope), JSON.stringify([...set].slice(-cap))); } catch { /* ignore */ }
};

export function loadNotifs(scope) {
  try {
    const raw = localStorage.getItem(k(KEY, scope));
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    const del = loadSet(DEL, scope);
    return del.size ? list.filter((n) => !del.has(n.id)) : list;
  } catch {
    return [];
  }
}

function save(scope, list) {
  try { localStorage.setItem(k(KEY, scope), JSON.stringify(list.slice(0, CAP))); } catch { /* modo privado / cheio: ignora */ }
}

const sortDesc = (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

// Mescla novas notificações (dedupe por id; excluídas não ressuscitam).
// Retorna { list, added }.
export function mergeNotifs(scope, incoming) {
  const list = loadNotifs(scope);
  const known = new Set(list.map((n) => n.id));
  const del = loadSet(DEL, scope);
  const added = (incoming || []).filter((n) => n && n.id && !known.has(n.id) && !del.has(n.id));
  if (!added.length) return { list, added: [] };
  const merged = [...added, ...list].sort(sortDesc).slice(0, CAP);
  save(scope, merged);
  return { list: merged, added };
}

// ── Lida / não lida (por id) ────────────────────────────────────────────────
export function getReadSet(scope) { return loadSet(READ, scope); }
export function markRead(scope, ids, read = true) {
  const s = loadSet(READ, scope);
  (ids || []).forEach((id) => (read ? s.add(id) : s.delete(id)));
  saveSet(READ, scope, s);
  return s;
}

// ── Exclusão (persistente: grava a lápide e remove da lista) ────────────────
export function removeNotifs(scope, ids) {
  const del = loadSet(DEL, scope);
  (ids || []).forEach((id) => del.add(id));
  saveSet(DEL, scope, del);
  const list = loadNotifs(scope);
  save(scope, list);
  return list;
}

export function getSeen(scope) {
  try { return Number(localStorage.getItem(k(SEEN, scope))) || 0; } catch { return 0; }
}
export function setSeen(scope, ts) {
  try { localStorage.setItem(k(SEEN, scope), String(ts)); } catch { /* ignore */ }
}
