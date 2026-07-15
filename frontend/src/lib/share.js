// Codifica a proposta dentro da própria URL (base64url), para o link público.
// É a solução sem backend. Quando houver Supabase, troca-se por um ID curto.
export function encodeProposal(doc) {
  const slim = {
    c: doc.client, co: doc.company, t: doc.title, s: doc.scope,
    it: (doc.items || []).map((x) => ({ d: x.desc, v: x.value })),
    st: doc.start, en: doc.end, pa: doc.payment, re: doc.revisions, va: doc.validity,
    bi: doc.bio, ac: doc.accent, tp: doc.template, id: doc.__id || null,
  };
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(slim))));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeProposal(token) {
  try {
    let b = String(token || "").replace(/-/g, "+").replace(/_/g, "/");
    while (b.length % 4) b += "=";
    const o = JSON.parse(decodeURIComponent(escape(atob(b))));
    return {
      client: o.c || "", company: o.co || "", title: o.t || "", scope: o.s || "",
      items: Array.isArray(o.it) ? o.it.map((x) => ({ desc: x.d || "", value: x.v || "" })) : [],
      start: o.st || "", end: o.en || "", payment: o.pa || "", revisions: o.re || "",
      validity: o.va || "", bio: o.bi || "", accent: o.ac || "#D97757", template: o.tp || "minimal",
      logo: null, __id: o.id || null,
    };
  } catch {
    return null;
  }
}
