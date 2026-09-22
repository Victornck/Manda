// Conta dos itens da proposta — FONTE ÚNICA no servidor.
//
// Existe uma cópia deste arquivo no front, em frontend/src/lib/items.js, com as
// MESMAS regras. São dois pacotes npm separados (backend e frontend), então não
// dá para importar um do outro sem mexer no build. Se mudar a regra aqui, mude
// lá — o total que o servidor grava em proposals.value e o total que o cliente
// lê na proposta têm de bater sempre.

// Só dígitos, igual ao resto do app: o campo de valor é texto desde a 001.
export const valueOf = (it) => parseInt(String(it?.value || "").replace(/\D/g, ""), 10) || 0;

// Quantidade: vazio, zero, lixo ou ausente valem 1. É o que faz toda proposta
// antiga (que não tem o campo) continuar somando exatamente o mesmo total.
export const qtyOf = (it) => {
  const n = parseInt(String(it?.qty ?? "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 9999) : 1;
};

// Total da linha. `showQty` desligado ignora a quantidade por completo, mesmo
// que ela esteja gravada: desligar a coluna tem de devolver a proposta ao total
// que ela tinha antes de alguém ligar a feature.
export const lineTotal = (it, showQty) => valueOf(it) * (showQty ? qtyOf(it) : 1);

export const sumItems = (items = [], showQty = false) =>
  (Array.isArray(items) ? items : [])
    .filter((it) => !it?.hidden) // itens ocultos não entram no total
    .reduce((a, it) => a + lineTotal(it, showQty), 0);
