import { font, color, brl } from "../theme.js";

// Conteúdo de exemplo usado nas miniaturas da galeria.
export const SAMPLE_DOC = {
  client: "Paula Rodrigues", company: "Viana Café", title: "Produção de vídeo institucional",
  scope: "Vídeo institucional de até 90 segundos para o site e as redes. Inclui roteiro, direção, uma diária de gravação e edição com trilha e legendas.",
  items: [{ desc: "Roteiro + direção", value: "1800" }, { desc: "Diária de gravação", value: "2400" }, { desc: "Edição + finalização", value: "1600" }],
  start: "10 de agosto", end: "5 de setembro",
  payment: "50% na aprovação, 50% na entrega", revisions: "2 rodadas", validity: "15 dias",
  bio: "Videomaker há 6 anos, especializado em vídeos para pequenas marcas.", logo: null,
};

const has = (v) => v != null && String(v).trim() !== "";
// Preenchimento do destaque: sólido, ou gradiente quando o usuário liga a segunda cor.
const accentFill = (doc, accent) => (doc.gradient && has(doc.accent2))
  ? `linear-gradient(135deg, ${accent} 0%, ${doc.accent2} 100%)`
  : accent;

// ── Contraste garantido ──────────────────────────────────────────────────────
// A cor de destaque é livre (o usuário escolhe qualquer uma), então nenhum
// texto pode depender só dela: destaque escuro some em fundo escuro e
// destaque claro some em fundo branco. Luminância aproximada de 0 a 1:
const lum = (hex) => {
  const h = String(hex || "").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (full.length !== 6) return 0;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return 0;
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
};
// Texto na cor de destaque SOBRE FUNDO ESCURO: se a cor for escura, vira branco.
const onDark = (a) => (lum(a) < 0.4 ? "#FFFFFF" : a);
// Texto na cor de destaque SOBRE FUNDO CLARO: se a cor for clara, vira tinta.
const onLight = (a) => (lum(a) > 0.68 ? "#18181B" : a);
// Texto de botões/faixas PINTADOS com a cor de destaque: branco ou tinta.
const btnText = (a) => (lum(a) > 0.68 ? "#18181B" : "#FFFFFF");
const filledItems = (doc) => doc.items.filter((it) => has(it.desc) || has(it.value));
const sum = (arr) => arr.reduce((a, it) => a + (parseInt(it.value, 10) || 0), 0);
const money = (v) => brl(parseInt(v, 10) || 0);
const kicker = (c) => ({ fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: c, marginBottom: 8 });

function Mono({ doc, size = 42, radius = 10, bg = color.ink, fg = "#fff" }) {
  if (doc.logo) return <img src={doc.logo} alt="" style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", display: "block", flex: "none" }} />;
  return <span style={{ width: size, height: size, borderRadius: radius, background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.heading, fontWeight: 900, fontSize: size * 0.42, flex: "none" }}>M</span>;
}

/* ---------- 1. MINIMAL ---------- */
function Minimal({ doc, accent, onAccept }) {
  const items = filledItems(doc);
  const total = sum(items);
  const dates = [["Início", doc.start], ["Entrega", doc.end]].filter(([, v]) => has(v));
  return (
    <div style={{ background: "#fff", border: `1px solid ${color.line}`, borderRadius: 14, overflow: "hidden", boxShadow: "0 12px 40px -16px rgba(20,20,30,0.16)", overflowWrap: "anywhere", wordBreak: "break-word" }}>
      <div style={{ height: 5, background: accent }} />
      <div style={{ padding: "30px 34px 34px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 26 }}>
          <Mono doc={doc} />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: color.gray400 }}>Proposta para</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{doc.client || "Cliente"}</div>
            {has(doc.company) && <div style={{ fontSize: "12.5px", color: color.gray500 }}>{doc.company}</div>}
          </div>
        </div>
        <h2 style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 25, lineHeight: 1.15, letterSpacing: "-0.02em", margin: `0 0 ${has(doc.scope) || items.length || dates.length ? 20 : 24}px`, color: doc.title ? color.ink : color.gray400 }}>{doc.title || "Título da proposta"}</h2>

        {has(doc.scope) && (<>
          <div style={kicker(color.gray400)}>Escopo</div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: color.gray700, margin: "0 0 24px" }}>{doc.scope}</p>
        </>)}

        {items.length > 0 && (<>
          <div style={kicker(color.gray400)}>Investimento</div>
          <div style={{ border: "1px solid #EEE", borderRadius: 11, overflow: "hidden", marginBottom: 12 }}>
            {items.map((it, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "11px 14px", borderBottom: i < items.length - 1 ? "1px solid #F2F2F2" : "none", fontSize: "13.5px" }}>
                <span style={{ color: color.gray700 }}>{it.desc || "Item"}</span><span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{money(it.value)}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <span style={{ fontSize: 13, color: color.gray500, fontWeight: 500 }}>Total</span>
            <span style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 24, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{brl(total)}</span>
          </div>
        </>)}

        {dates.length > 0 && (
          <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
            {dates.map(([k, v]) => (
              <div key={k}><div style={{ fontSize: "11.5px", color: color.gray400, marginBottom: 3 }}>{k}</div><div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div></div>
            ))}
          </div>
        )}

        {has(doc.bio) && (
          <div style={{ marginBottom: 24 }}>
            <div style={kicker(color.gray400)}>Sobre mim</div>
            <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: color.gray600, margin: 0 }}>{doc.bio}</p>
          </div>
        )}

        <button onClick={onAccept} style={{ width: "100%", fontFamily: font.body, fontSize: 15, fontWeight: 600, color: btnText(accent), background: accent, border: "none", padding: 13, borderRadius: 10, cursor: "pointer" }}>Aceitar proposta</button>
      </div>
    </div>
  );
}

/* ---------- 2. BOLD ---------- */
function Bold({ doc, accent, onAccept }) {
  const items = filledItems(doc);
  const total = sum(items);
  const chips = [["Início", doc.start], ["Entrega", doc.end], ["Validade", doc.validity]].filter(([, v]) => has(v));
  return (
    <div style={{ background: "#fff", border: `1px solid ${color.line}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 12px 40px -16px rgba(20,20,30,0.16)", overflowWrap: "anywhere", wordBreak: "break-word" }}>
      <div style={{ background: accentFill(doc, accent), color: btnText(accent), padding: "26px 30px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <Mono doc={doc} size={34} radius={9} bg="rgba(255,255,255,0.18)" />
          <div style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.85 }}>Proposta</div>
        </div>
        <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", opacity: 0.85, marginBottom: 8 }}>Para {doc.client || "cliente"}{has(doc.company) ? ` · ${doc.company}` : ""}</div>
        <div style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 30, lineHeight: 1.02, letterSpacing: "-0.03em" }}>{doc.title || "Título da proposta"}</div>
      </div>
      <div style={{ padding: "24px 30px 30px" }}>
        {has(doc.scope) && <p style={{ fontSize: 14, lineHeight: 1.6, color: color.gray700, margin: "0 0 22px" }}>{doc.scope}</p>}
        {items.length > 0 && (<>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 18 }}>
            {items.map((it, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px dashed #E4E4E7", fontSize: 14 }}>
                <span style={{ color: color.gray700 }}>{it.desc || "Item"}</span><span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{money(it.value)}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 22 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: color.gray500 }}>Total</span>
            <span style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 34, letterSpacing: "-0.03em", color: onLight(accent), fontVariantNumeric: "tabular-nums" }}>{brl(total)}</span>
          </div>
        </>)}
        {chips.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
            {chips.map(([k, v]) => (
              <span key={k} style={{ fontSize: "12.5px", color: color.gray700, background: color.surface, borderRadius: 8, padding: "6px 10px" }}><b style={{ color: color.gray400, fontWeight: 600 }}>{k}:</b> {v}</span>
            ))}
          </div>
        )}
        {has(doc.bio) && (
          <div style={{ marginBottom: 22, paddingTop: 18, borderTop: "1px solid #F0F0F0" }}>
            <div style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: color.gray400, marginBottom: 6 }}>Sobre mim</div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: color.gray600, margin: 0 }}>{doc.bio}</p>
          </div>
        )}
        <button onClick={onAccept} style={{ width: "100%", fontFamily: font.body, fontSize: 15, fontWeight: 700, color: "#fff", background: color.ink, border: "none", padding: 14, borderRadius: 10, cursor: "pointer" }}>Aceitar proposta</button>
      </div>
    </div>
  );
}

/* ---------- 3. EDITORIAL ---------- */
function Editorial({ doc, accent, onAccept }) {
  const items = filledItems(doc);
  const total = sum(items);
  const meta = [["Cliente", doc.client || "Cliente"], ["Início", doc.start], ["Entrega", doc.end]].filter(([k, v]) => k === "Cliente" || has(v));
  const conds = [["Pagamento", doc.payment], ["Revisões", doc.revisions]].filter(([, v]) => has(v));
  const rule = { height: 1, background: color.ink, opacity: 0.14 };
  return (
    <div style={{ background: "#fff", border: `1px solid ${color.gray200}`, borderRadius: 6, padding: "30px 32px 32px", overflowWrap: "anywhere", wordBreak: "break-word" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Mono doc={doc} size={30} radius={7} />
          <span style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" }}>{doc.company || "Seu estúdio"}</span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: onLight(accent) }}>Proposta</div>
          {has(doc.validity) && <div style={{ fontSize: 12, color: color.gray400 }}>Válida por {doc.validity}</div>}
        </div>
      </div>
      <div style={rule} />
      <h2 style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 27, lineHeight: 1.12, letterSpacing: "-0.02em", margin: "18px 0 18px", color: doc.title ? color.ink : color.gray400 }}>{doc.title || "Título da proposta"}</h2>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${meta.length}, 1fr)`, gap: 14, marginBottom: 20 }}>
        {meta.map(([k, v]) => (
          <div key={k}><div style={{ fontSize: "10.5px", letterSpacing: "0.06em", textTransform: "uppercase", color: color.gray400, marginBottom: 3 }}>{k}</div><div style={{ fontSize: "13.5px", fontWeight: 600 }}>{v}</div></div>
        ))}
      </div>
      <div style={rule} />
      {has(doc.scope) && (<>
        <div style={{ ...kicker(color.gray500), margin: "18px 0 8px" }}>Escopo</div>
        <p style={{ fontSize: "13.5px", lineHeight: 1.65, color: color.gray700, margin: "0 0 22px" }}>{doc.scope}</p>
      </>)}
      {items.length > 0 && (<>
        <div style={{ ...kicker(color.gray500), margin: has(doc.scope) ? "0 0 4px" : "18px 0 4px" }}>Investimento</div>
        <div style={{ ...rule, marginBottom: 0 }} />
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F0F0F0", fontSize: "13.5px" }}>
            <span style={{ color: color.gray700 }}>{it.desc || "Item"}</span><span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{money(it.value)}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "12px 0 0" }}>
          <span style={{ fontSize: "10.5px", letterSpacing: "0.08em", textTransform: "uppercase", color: color.gray400 }}>Total</span>
          <span style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{brl(total)}</span>
        </div>
      </>)}
      {conds.length > 0 && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: `2px solid ${accent}`, fontSize: "12.5px", color: color.gray600, lineHeight: 1.6 }}>
          {conds.map(([k, v]) => <div key={k}>{k}: {v}</div>)}
        </div>
      )}
      {has(doc.bio) && (
        <div style={{ marginTop: 20 }}>
          <div style={{ ...kicker(color.gray500), margin: "0 0 6px" }}>Sobre mim</div>
          <p style={{ fontSize: "12.5px", lineHeight: 1.65, color: color.gray600, margin: 0 }}>{doc.bio}</p>
        </div>
      )}
      <button onClick={onAccept} style={{ marginTop: 20, width: "100%", fontFamily: font.body, fontSize: 14.5, fontWeight: 600, color: color.ink, background: "#fff", border: `1.5px solid ${color.ink}`, padding: 12, borderRadius: 8, cursor: "pointer" }}>Aceitar proposta</button>
    </div>
  );
}

/* ---------- 4. COLORIDO ---------- */
function Colorido({ doc, accent, onAccept }) {
  const items = filledItems(doc);
  const total = sum(items);
  const dates = [["Início", doc.start], ["Entrega", doc.end]].filter(([, v]) => has(v));
  const headBg = (doc.gradient && has(doc.accent2))
    ? `linear-gradient(135deg, ${accent} 0%, ${doc.accent2} 100%)`
    : `radial-gradient(120% 130% at 85% -10%, ${accent} 0%, ${accent}CC 55%, ${accent}99 100%)`;
  return (
    <div style={{ background: "#fff", border: `1px solid ${color.line}`, borderRadius: 18, overflow: "hidden", boxShadow: "0 16px 44px -18px rgba(20,20,30,0.28)", overflowWrap: "anywhere", wordBreak: "break-word" }}>
      <div style={{ background: headBg, color: btnText(accent), padding: "30px 30px 34px" }}>
        <Mono doc={doc} size={44} radius={12} bg="rgba(255,255,255,0.22)" />
        <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", opacity: 0.9, margin: "22px 0 6px" }}>Proposta para {doc.client || "cliente"}</div>
        <div style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 28, lineHeight: 1.04, letterSpacing: "-0.03em" }}>{doc.title || "Título da proposta"}</div>
      </div>
      <div style={{ padding: "24px 30px 30px" }}>
        {has(doc.scope) && <p style={{ fontSize: 14, lineHeight: 1.6, color: color.gray700, margin: "0 0 22px" }}>{doc.scope}</p>}
        {items.length > 0 && (
          <div style={{ background: color.surface2, borderRadius: 14, padding: "16px 18px", marginBottom: 20 }}>
            {items.map((it, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < items.length - 1 ? "1px solid #EDEDED" : "none", fontSize: "13.5px" }}>
                <span style={{ color: color.gray700 }}>{it.desc || "Item"}</span><span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{money(it.value)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 12, marginTop: 6, borderTop: "1px solid #E4E4E7" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: color.gray500 }}>Total</span>
              <span style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 24, letterSpacing: "-0.02em", color: onLight(accent), fontVariantNumeric: "tabular-nums" }}>{brl(total)}</span>
            </div>
          </div>
        )}
        {dates.length > 0 && (
          <div style={{ display: "flex", gap: 20, marginBottom: 22 }}>
            {dates.map(([k, v]) => (
              <div key={k}><div style={{ fontSize: "11.5px", color: color.gray400, marginBottom: 3 }}>{k}</div><div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div></div>
            ))}
          </div>
        )}
        {has(doc.bio) && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: color.gray400, marginBottom: 6 }}>Sobre mim</div>
            <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: color.gray600, margin: 0 }}>{doc.bio}</p>
          </div>
        )}
        <button onClick={onAccept} style={{ width: "100%", fontFamily: font.body, fontSize: 15, fontWeight: 700, color: btnText(accent), background: accent, border: "none", padding: 14, borderRadius: 12, cursor: "pointer" }}>Aceitar proposta</button>
      </div>
    </div>
  );
}

/* ---------- 5. CAPA (com foto) ---------- */
function Capa({ doc, accent, onAccept }) {
  const items = filledItems(doc);
  const total = sum(items);
  const dates = [["Início", doc.start], ["Entrega", doc.end]].filter(([, v]) => has(v));
  const hero = doc.cover
    ? { backgroundImage: `url(${doc.cover})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: `linear-gradient(135deg, ${accent} 0%, ${accent}B3 100%)` };
  return (
    <div style={{ background: "#fff", border: `1px solid ${color.line}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 12px 40px -16px rgba(20,20,30,0.16)", overflowWrap: "anywhere", wordBreak: "break-word" }}>
      <div style={{ position: "relative", height: 200, ...hero }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.6) 100%)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "22px 24px", color: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
            {doc.logo
              ? <img src={doc.logo} alt="" style={{ width: 30, height: 30, borderRadius: 8, objectFit: "cover", display: "block" }} />
              : <span style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.heading, fontWeight: 900, fontSize: 14 }}>M</span>}
            <span style={{ fontSize: "12.5px", fontWeight: 500, opacity: 0.92 }}>Proposta para {doc.client || "cliente"}{has(doc.company) ? ` · ${doc.company}` : ""}</span>
          </div>
          <div style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 25, lineHeight: 1.05, letterSpacing: "-0.02em", textShadow: "0 2px 12px rgba(0,0,0,0.35)" }}>{doc.title || "Título da proposta"}</div>
        </div>
      </div>
      <div style={{ padding: "24px 26px 26px" }}>
        {has(doc.scope) && (<>
          <div style={kicker(color.gray400)}>Escopo</div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: color.gray700, margin: "0 0 22px" }}>{doc.scope}</p>
        </>)}
        {items.length > 0 && (<>
          <div style={kicker(color.gray400)}>Investimento</div>
          <div style={{ border: "1px solid #EEE", borderRadius: 11, overflow: "hidden", marginBottom: 12 }}>
            {items.map((it, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "11px 14px", borderBottom: i < items.length - 1 ? "1px solid #F2F2F2" : "none", fontSize: "13.5px" }}>
                <span style={{ color: color.gray700 }}>{it.desc || "Item"}</span><span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{money(it.value)}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
            <span style={{ fontSize: 13, color: color.gray500, fontWeight: 500 }}>Total</span>
            <span style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 24, letterSpacing: "-0.02em", color: onLight(accent), fontVariantNumeric: "tabular-nums" }}>{brl(total)}</span>
          </div>
        </>)}
        {dates.length > 0 && (
          <div style={{ display: "flex", gap: 24, marginBottom: 22 }}>
            {dates.map(([k, v]) => (<div key={k}><div style={{ fontSize: "11.5px", color: color.gray400, marginBottom: 3 }}>{k}</div><div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div></div>))}
          </div>
        )}
        {has(doc.bio) && (
          <div style={{ marginBottom: 22 }}>
            <div style={kicker(color.gray400)}>Sobre mim</div>
            <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: color.gray600, margin: 0 }}>{doc.bio}</p>
          </div>
        )}
        <button onClick={onAccept} style={{ width: "100%", fontFamily: font.body, fontSize: 15, fontWeight: 600, color: btnText(accent), background: accent, border: "none", padding: 14, borderRadius: 11, cursor: "pointer" }}>Aceitar proposta</button>
      </div>
    </div>
  );
}

/* ---------- 6. DOSSIÊ (foto escura) ---------- */
function Dossie({ doc, accent, onAccept }) {
  const items = filledItems(doc);
  const total = sum(items);
  const chips = [["Início", doc.start], ["Entrega", doc.end], ["Validade", doc.validity]].filter(([, v]) => has(v));
  const hero = doc.cover
    ? { backgroundImage: `url(${doc.cover})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: "linear-gradient(155deg, #241a16 0%, #0C0C0C 100%)" };
  return (
    <div style={{ background: "#0E0E0E", color: "#fff", border: "1px solid #1E1E1E", borderRadius: 16, overflow: "hidden", boxShadow: "0 16px 44px -18px rgba(0,0,0,0.5)", overflowWrap: "anywhere", wordBreak: "break-word" }}>
      <div style={{ position: "relative", height: 224, ...hero }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(14,14,14,0.96) 100%)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "26px 26px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: onDark(accent), marginBottom: 10 }}>Proposta · {doc.client || "cliente"}</div>
          <div style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 27, lineHeight: 1.02, letterSpacing: "-0.01em", textTransform: "uppercase" }}>{doc.title || "Título da proposta"}</div>
        </div>
      </div>
      <div style={{ padding: "24px 26px 28px" }}>
        {has(doc.scope) && <p style={{ fontSize: 14, lineHeight: 1.65, color: "#C9C9CE", margin: "0 0 22px" }}>{doc.scope}</p>}
        {items.length > 0 && (<>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 18 }}>
            {items.map((it, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid #222", fontSize: 14 }}>
                <span style={{ color: "#D4D4D8" }}>{it.desc || "Item"}</span><span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{money(it.value)}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 22 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#9A9AA0" }}>Total</span>
            <span style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 32, letterSpacing: "-0.03em", color: onDark(accent), fontVariantNumeric: "tabular-nums" }}>{brl(total)}</span>
          </div>
        </>)}
        {chips.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
            {chips.map(([k, v]) => (<span key={k} style={{ fontSize: "12.5px", color: "#D4D4D8", background: "#1A1A1A", border: "1px solid #262626", borderRadius: 8, padding: "6px 10px" }}><b style={{ color: "#8A8A90", fontWeight: 600 }}>{k}:</b> {v}</span>))}
          </div>
        )}
        {has(doc.bio) && (
          <div style={{ marginBottom: 22, paddingTop: 18, borderTop: "1px solid #222" }}>
            <div style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8A8A90", marginBottom: 6 }}>Sobre mim</div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "#B4B4BA", margin: 0 }}>{doc.bio}</p>
          </div>
        )}
        <button onClick={onAccept} style={{ width: "100%", fontFamily: font.body, fontSize: 15, fontWeight: 700, color: btnText(accent), background: accent, border: "none", padding: 14, borderRadius: 11, cursor: "pointer" }}>Aceitar proposta</button>
      </div>
    </div>
  );
}

/* ---------- 7. CARTA (papel elegante, serifa) ---------- */
const serif = "Georgia, 'Times New Roman', serif";
function Carta({ doc, accent, onAccept }) {
  const items = filledItems(doc);
  const total = sum(items);
  const meta = [["Início", doc.start], ["Entrega", doc.end], ["Validade", doc.validity]].filter(([, v]) => has(v));
  const conds = [["Pagamento", doc.payment], ["Revisões", doc.revisions]].filter(([, v]) => has(v));
  return (
    <div style={{ background: "#FBF8F2", border: "1px solid #E8E1D4", borderRadius: 10, padding: "36px 38px 34px", overflowWrap: "anywhere", wordBreak: "break-word", boxShadow: "0 12px 40px -18px rgba(60,45,20,0.18)" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 22 }}>
        <Mono doc={doc} size={44} radius={22} bg="#2B2118" />
        <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "#8C7B62", margin: "14px 0 4px" }}>{doc.company || "Proposta comercial"}</div>
        <div style={{ width: 46, borderTop: `2px solid ${accent}`, margin: "10px 0 0" }} />
      </div>
      <h2 style={{ fontFamily: serif, fontWeight: 700, fontSize: 27, lineHeight: 1.18, letterSpacing: "-0.01em", textAlign: "center", margin: "0 0 8px", color: doc.title ? "#241C12" : "#B0A890" }}>{doc.title || "Título da proposta"}</h2>
      <div style={{ fontFamily: serif, fontStyle: "italic", fontSize: "14.5px", color: "#6E5F49", textAlign: "center", marginBottom: 24 }}>preparada para {doc.client || "seu cliente"}</div>

      {has(doc.scope) && (
        <p style={{ fontFamily: serif, fontSize: "14.5px", lineHeight: 1.75, color: "#3E3527", margin: "0 0 24px" }}>{doc.scope}</p>
      )}

      {items.length > 0 && (<>
        <div style={{ borderTop: "1px solid #E3DACA", borderBottom: "1px solid #E3DACA", padding: "6px 0", marginBottom: 14 }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "9px 2px", borderBottom: i < items.length - 1 ? "1px dotted #DDD2BE" : "none", fontSize: "13.5px" }}>
              <span style={{ fontFamily: serif, color: "#3E3527" }}>{it.desc || "Item"}</span>
              <span style={{ fontFamily: serif, fontWeight: 700, color: "#241C12", fontVariantNumeric: "tabular-nums" }}>{money(it.value)}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
          <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8C7B62" }}>Investimento total</span>
          <span style={{ fontFamily: serif, fontWeight: 700, fontSize: 26, color: "#241C12", fontVariantNumeric: "tabular-nums" }}>{brl(total)}</span>
        </div>
      </>)}

      {meta.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 26, marginBottom: 22, flexWrap: "wrap" }}>
          {meta.map(([k, v]) => (
            <div key={k} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#A08F74", marginBottom: 3 }}>{k}</div>
              <div style={{ fontFamily: serif, fontSize: "13.5px", fontWeight: 700, color: "#3E3527" }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {conds.length > 0 && (
        <div style={{ fontFamily: serif, fontSize: "12.5px", fontStyle: "italic", color: "#6E5F49", textAlign: "center", lineHeight: 1.7, marginBottom: 20 }}>
          {conds.map(([k, v]) => <div key={k}>{k}: {v}</div>)}
        </div>
      )}

      {has(doc.bio) && (
        <div style={{ borderTop: "1px solid #E3DACA", paddingTop: 16, marginBottom: 22 }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#A08F74", textAlign: "center", marginBottom: 7 }}>Sobre mim</div>
          <p style={{ fontFamily: serif, fontSize: "13px", lineHeight: 1.7, color: "#4E4433", textAlign: "center", margin: 0 }}>{doc.bio}</p>
        </div>
      )}

      <button onClick={onAccept} style={{ width: "100%", fontFamily: font.body, fontSize: 14.5, fontWeight: 600, color: "#FBF8F2", background: "#2B2118", border: "none", padding: 13, borderRadius: 8, cursor: "pointer", letterSpacing: "0.02em" }}>Aceitar proposta</button>
    </div>
  );
}

/* ---------- 8. RECIBO (cupom criativo, monospace) ---------- */
const monosp = "'Courier New', ui-monospace, monospace";
function Recibo({ doc, accent, onAccept }) {
  const items = filledItems(doc);
  const total = sum(items);
  const meta = [["INICIO", doc.start], ["ENTREGA", doc.end], ["VALIDADE", doc.validity]].filter(([, v]) => has(v));
  const line = <div style={{ borderTop: "2px dashed #D8D8DC", margin: "16px 0" }} />;
  return (
    <div style={{ position: "relative", background: "#fff", border: `1px solid ${color.line}`, borderRadius: 12, padding: "28px 26px 26px", overflowWrap: "anywhere", wordBreak: "break-word", boxShadow: "0 12px 40px -16px rgba(20,20,30,0.16)", fontFamily: monosp }}>
      <div style={{ position: "absolute", top: 18, right: 16, transform: "rotate(8deg)", border: `2px solid ${onLight(accent)}`, color: onLight(accent), borderRadius: 6, fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", padding: "4px 8px", opacity: 0.85 }}>PROPOSTA</div>
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <Mono doc={doc} size={40} radius={20} />
      </div>
      <div style={{ textAlign: "center", fontSize: "13px", fontWeight: 700, letterSpacing: "0.06em", marginBottom: 2 }}>{(doc.company || "SEU ESTÚDIO").toUpperCase()}</div>
      <div style={{ textAlign: "center", fontSize: "11.5px", color: color.gray500 }}>para {doc.client || "cliente"}</div>
      {line}
      <div style={{ fontSize: "15px", fontWeight: 700, lineHeight: 1.35, textAlign: "center", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.02em", color: doc.title ? color.ink : color.gray400 }}>{doc.title || "Título da proposta"}</div>
      {has(doc.scope) && <p style={{ fontSize: "12px", lineHeight: 1.65, color: color.gray600, margin: "12px 0 0" }}>{doc.scope}</p>}
      {line}
      {items.length > 0 && (<>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 6, padding: "5px 0", fontSize: "12.5px" }}>
            <span style={{ color: color.gray700, flex: "none", maxWidth: "62%" }}>{(it.desc || "Item").toUpperCase()}</span>
            <span style={{ flex: 1, borderBottom: "1.5px dotted #C8C8CE", transform: "translateY(-3px)" }} />
            <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{money(it.value)}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 12, paddingTop: 12, borderTop: `2px solid ${color.ink}` }}>
          <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em" }}>TOTAL</span>
          <span style={{ fontSize: "22px", fontWeight: 700, color: onLight(accent), fontVariantNumeric: "tabular-nums" }}>{brl(total)}</span>
        </div>
      </>)}
      {meta.length > 0 && (<>
        {line}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          {meta.map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: "9.5px", letterSpacing: "0.1em", color: color.gray400, marginBottom: 2 }}>{k}</div>
              <div style={{ fontSize: "12px", fontWeight: 700 }}>{v}</div>
            </div>
          ))}
        </div>
      </>)}
      {has(doc.bio) && (<>
        {line}
        <p style={{ fontSize: "11.5px", lineHeight: 1.65, color: color.gray600, margin: 0, textAlign: "center" }}>{doc.bio}</p>
      </>)}
      {line}
      <button onClick={onAccept} style={{ width: "100%", fontFamily: monosp, fontSize: 14, fontWeight: 700, letterSpacing: "0.06em", color: btnText(accent), background: accent, border: "none", padding: 13, borderRadius: 8, cursor: "pointer" }}>ACEITAR PROPOSTA</button>
      <div style={{ textAlign: "center", fontSize: "10px", letterSpacing: "0.14em", color: color.gray400, marginTop: 12 }}>* OBRIGADO PELA PREFERÊNCIA *</div>
    </div>
  );
}

/* ---------- 9. AURORA (suave, gradiente) ---------- */
function Aurora({ doc, accent, onAccept }) {
  const items = filledItems(doc);
  const total = sum(items);
  const dates = [["Início", doc.start], ["Entrega", doc.end], ["Validade", doc.validity]].filter(([, v]) => has(v));
  const a2 = (doc.gradient && has(doc.accent2)) ? doc.accent2 : accent;
  return (
    <div style={{ position: "relative", background: `linear-gradient(165deg, ${accent}16 0%, #FFFFFF 42%, ${a2}10 100%)`, border: `1px solid ${color.line}`, borderRadius: 22, padding: "30px 30px 28px", overflow: "hidden", overflowWrap: "anywhere", wordBreak: "break-word", boxShadow: "0 16px 48px -20px rgba(20,20,30,0.22)" }}>
      <div style={{ position: "absolute", top: -70, right: -70, width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle, ${a2}33 0%, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <Mono doc={doc} size={40} radius={13} />
        <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: btnText(accent), background: accentFill(doc, accent), borderRadius: 999, padding: "6px 12px" }}>Proposta</span>
      </div>
      <div style={{ fontSize: "12.5px", fontWeight: 500, color: color.gray500, marginBottom: 6 }}>Para {doc.client || "cliente"}{has(doc.company) ? ` · ${doc.company}` : ""}</div>
      <h2 style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 26, lineHeight: 1.08, letterSpacing: "-0.03em", margin: "0 0 18px", color: doc.title ? color.ink : color.gray400 }}>{doc.title || "Título da proposta"}</h2>
      {has(doc.scope) && <p style={{ fontSize: 14, lineHeight: 1.65, color: color.gray700, margin: "0 0 20px" }}>{doc.scope}</p>}
      {items.length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.9)", borderRadius: 16, padding: "16px 18px", marginBottom: 18, boxShadow: "0 8px 24px -14px rgba(20,20,30,0.18)" }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < items.length - 1 ? "1px solid #EFEFF2" : "none", fontSize: "13.5px" }}>
              <span style={{ color: color.gray700 }}>{it.desc || "Item"}</span><span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{money(it.value)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 12, marginTop: 6, borderTop: "1px solid #E7E7EC" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: color.gray500 }}>Total</span>
            <span style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 25, letterSpacing: "-0.02em", color: onLight(accent), fontVariantNumeric: "tabular-nums" }}>{brl(total)}</span>
          </div>
        </div>
      )}
      {dates.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {dates.map(([k, v]) => (
            <span key={k} style={{ fontSize: "12.5px", color: color.gray700, background: "rgba(255,255,255,0.75)", border: `1px solid ${color.line2}`, borderRadius: 999, padding: "6px 12px" }}><b style={{ color: color.gray400, fontWeight: 600 }}>{k}:</b> {v}</span>
          ))}
        </div>
      )}
      {has(doc.bio) && (
        <div style={{ marginBottom: 20 }}>
          <div style={kicker(color.gray400)}>Sobre mim</div>
          <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: color.gray600, margin: 0 }}>{doc.bio}</p>
        </div>
      )}
      <button onClick={onAccept} style={{ width: "100%", fontFamily: font.body, fontSize: 15, fontWeight: 700, color: btnText(accent), background: accentFill(doc, accent), border: "none", padding: 14, borderRadius: 14, cursor: "pointer", boxShadow: `0 10px 24px -10px ${accent}80` }}>Aceitar proposta</button>
    </div>
  );
}

/* ---------- 10. STUDIO (duas colunas, lateral escura) ---------- */
function Studio({ doc, accent, onAccept }) {
  const items = filledItems(doc);
  const total = sum(items);
  const meta = [["Início", doc.start], ["Entrega", doc.end], ["Validade", doc.validity], ["Pagamento", doc.payment]].filter(([, v]) => has(v));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "168px 1fr", background: "#fff", border: `1px solid ${color.line}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 14px 44px -18px rgba(20,20,30,0.25)", overflowWrap: "anywhere", wordBreak: "break-word" }}>
      <div style={{ background: "#121214", color: "#fff", padding: "24px 18px", display: "flex", flexDirection: "column", gap: 18 }}>
        <Mono doc={doc} size={38} radius={10} bg="rgba(255,255,255,0.14)" />
        <div>
          <div style={{ fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: onDark(accent), marginBottom: 5 }}>Proposta para</div>
          <div style={{ fontSize: "13.5px", fontWeight: 700, lineHeight: 1.3 }}>{doc.client || "Cliente"}</div>
          {has(doc.company) && <div style={{ fontSize: "11.5px", color: "#9A9AA0", marginTop: 2 }}>{doc.company}</div>}
        </div>
        {meta.map(([k, v]) => (
          <div key={k}>
            <div style={{ fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#77777D", marginBottom: 3 }}>{k}</div>
            <div style={{ fontSize: "12px", fontWeight: 600, lineHeight: 1.35, color: "#E4E4E7" }}>{v}</div>
          </div>
        ))}
        {items.length > 0 && (
          <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid #26262A" }}>
            <div style={{ fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#77777D", marginBottom: 4 }}>Total</div>
            <div style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 21, letterSpacing: "-0.02em", color: onDark(accent), fontVariantNumeric: "tabular-nums" }}>{brl(total)}</div>
          </div>
        )}
      </div>
      <div style={{ padding: "26px 26px 24px", minWidth: 0 }}>
        <h2 style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 24, lineHeight: 1.1, letterSpacing: "-0.03em", margin: "0 0 16px", color: doc.title ? color.ink : color.gray400 }}>{doc.title || "Título da proposta"}</h2>
        {has(doc.scope) && (<>
          <div style={kicker(color.gray400)}>Escopo</div>
          <p style={{ fontSize: "13.5px", lineHeight: 1.65, color: color.gray700, margin: "0 0 20px" }}>{doc.scope}</p>
        </>)}
        {items.length > 0 && (<>
          <div style={kicker(color.gray400)}>Investimento</div>
          <div style={{ marginBottom: 20 }}>
            {items.map((it, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: i < items.length - 1 ? "1px solid #F1F1F3" : "none", fontSize: "13.5px" }}>
                <span style={{ color: color.gray700 }}>{it.desc || "Item"}</span>
                <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{money(it.value)}</span>
              </div>
            ))}
          </div>
        </>)}
        {has(doc.bio) && (
          <div style={{ marginBottom: 20 }}>
            <div style={kicker(color.gray400)}>Sobre mim</div>
            <p style={{ fontSize: "13px", lineHeight: 1.6, color: color.gray600, margin: 0 }}>{doc.bio}</p>
          </div>
        )}
        <button onClick={onAccept} style={{ width: "100%", fontFamily: font.body, fontSize: 14.5, fontWeight: 700, color: btnText(accent), background: accent, border: "none", padding: 13, borderRadius: 10, cursor: "pointer" }}>Aceitar proposta</button>
      </div>
    </div>
  );
}

export const DESIGNS = [
  { id: "minimal", name: "Minimal", tag: "Clean", accent: "#0A0A0A", Comp: Minimal, cat: "clean" },
  { id: "bold", name: "Bold", tag: "Impacto", accent: "#D97757", Comp: Bold, cat: "vibrante" },
  { id: "editorial", name: "Editorial", tag: "Formal", accent: "#2E7D51", Comp: Editorial, cat: "clean" },
  { id: "colorido", name: "Colorido", tag: "Vibrante", accent: "#6C48B0", Comp: Colorido, cat: "vibrante" },
  { id: "capa", name: "Capa", tag: "Com foto", accent: "#D97757", Comp: Capa, cover: true, cat: "foto" },
  { id: "dossie", name: "Dossiê", tag: "Foto escura", accent: "#D97757", Comp: Dossie, cover: true, cat: "foto" },
  { id: "carta", name: "Carta", tag: "Elegante", accent: "#8A5A1A", Comp: Carta, cat: "clean", novo: true },
  { id: "aurora", name: "Aurora", tag: "Suave", accent: "#3A5BB5", Comp: Aurora, cat: "vibrante", novo: true },
  { id: "studio", name: "Studio", tag: "Duas colunas", accent: "#D97757", Comp: Studio, cat: "escuro", novo: true },
  { id: "recibo", name: "Recibo", tag: "Criativo", accent: "#D97757", Comp: Recibo, cat: "criativo", novo: true },
];

export function ProposalDesign({ id, doc, accent, onAccept }) {
  const d = DESIGNS.find((x) => x.id === id) || DESIGNS[0];
  const Comp = d.Comp;
  return <Comp doc={doc} accent={accent || doc.accent || d.accent} onAccept={onAccept} />;
}
