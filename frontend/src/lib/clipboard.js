// Copia um texto para a área de transferência e DIZ se conseguiu.
//
// navigator.clipboard só existe em contexto seguro (https/localhost) e pode ser
// negado pelo navegador (permissão, iframe, aba sem foco). Antes o app chamava
// writeText, ignorava a falha e mostrava "Copiado!" de qualquer jeito. Aqui a
// falha é tratada: tenta a API moderna, cai no método antigo (textarea +
// execCommand, que ainda é o que funciona em webviews de Instagram/WhatsApp) e
// só devolve true se alguma das duas realmente copiou.
export async function copyText(text) {
  const value = String(text || "");
  if (!value) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch { /* cai no método antigo */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return !!ok;
  } catch {
    return false;
  }
}
