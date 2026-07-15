// Armazenamento LOCAL das propostas (localStorage). É a única coisa que o app
// guarda localmente. Rascunhos inacabados e propostas concluídas ficam aqui
// até você ligar um backend (Supabase) de verdade.
const KEY = "manda_proposals_v1";

export function loadProposals() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function save(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* modo privado / storage cheio: ignora silenciosamente */
  }
}

export function upsertProposal(p) {
  const list = loadProposals();
  const i = list.findIndex((x) => x.id === p.id);
  if (i >= 0) list[i] = p;
  else list.unshift(p);
  save(list);
  return list;
}

export function removeProposal(id) {
  const list = loadProposals().filter((x) => x.id !== id);
  save(list);
  return list;
}

export function newId() {
  return "d_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
