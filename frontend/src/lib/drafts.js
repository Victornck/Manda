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

// ---------------------------------------------------------------------------
// BUFFER de edição: a cópia de segurança do que está sendo digitado AGORA.
//
// O salvamento de verdade é no servidor (autosave do editor). Só que entre a
// tecla e a resposta do servidor existe uma janela — debounce, rede lenta,
// servidor fora, aba descartada pelo celular por falta de memória. O buffer
// cobre essa janela: é gravado de forma SÍNCRONA a cada alteração, então
// sobrevive a F5, a fechar a aba e ao sistema matar a página sem avisar
// (nenhum evento de saída é confiável no mobile, por isso não dependemos deles).
//
// Ele só existe enquanto houver algo que o servidor ainda não confirmou: quando
// o servidor responde com a mesma versão, a entrada é apagada. Ao reabrir uma
// proposta, se houver buffer mais novo que a versão do servidor, é ele que vale.
// ---------------------------------------------------------------------------
const BUF_KEY = "manda_draft_buf_v1";
const BUF_MAX = 20; // propostas com alteração pendente guardadas ao mesmo tempo

function readBuf() {
  try {
    const o = JSON.parse(localStorage.getItem(BUF_KEY) || "{}");
    return o && typeof o === "object" && !Array.isArray(o) ? o : {};
  } catch { return {}; }
}
function writeBuf(o) {
  try { localStorage.setItem(BUF_KEY, JSON.stringify(o)); return true; } catch { return false; }
}

export function loadBuffer(id) {
  const e = readBuf()[id];
  return e && e.doc ? e : null;
}

// Devolve false se o navegador recusou gravar (modo privado, armazenamento cheio).
export function saveBuffer(id, doc) {
  if (!id) return false;
  const all = readBuf();
  all[id] = { doc, ts: Date.now() };
  const ids = Object.keys(all);
  if (ids.length > BUF_MAX) {
    ids.sort((a, b) => (all[a].ts || 0) - (all[b].ts || 0)).slice(0, ids.length - BUF_MAX).forEach((k) => { delete all[k]; });
  }
  return writeBuf(all);
}

export function clearBuffer(id) {
  const all = readBuf();
  if (!(id in all)) return;
  delete all[id];
  writeBuf(all);
}
