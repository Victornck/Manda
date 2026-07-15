import { font, color, brl } from "../theme.js";

// Conteúdo de exemplo usado nas miniaturas da galeria.
export const SAMPLE_DOC = {
  client: "Ana Furtado", company: "Viana Café", title: "Produção de vídeo institucional",
  scope: "Vídeo institucional de até 90 segundos para o site e as redes. Inclui roteiro, direção, uma diária de gravação e edição com trilha e legendas.",
  items: [{ desc: "Roteiro + direção", value: "1800" }, { desc: "Diária de gravação", value: "2400" }, { desc: "Edição + finalização", value: "1600" }],
  start: "10 de agosto", end: "5 de setembro",
  payment: "50% na aprovação, 50% na entrega", revisions: "2 rodadas", validity: "15 dias",
  bio: "Videomaker há 6 anos, especializado em vídeos para pequenas marcas.", logo: null,
};

const has = (v) => v != null && String(v).trim() !== "";
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
    <div style={{ background: "#fff", border: `1px solid ${color.line}`, borderRadius: 14, overflow: "hidden", boxShadow: "0 12px 40px -16px rgba(20,20,30,0.16)" }}>
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

        <button onClick={onAccept} style={{ width: "100%", fontFamily: font.body, fontSize: 15, fontWeight: 600, color: "#fff", background: accent, border: "none", padding: 13, borderRadius: 10, cursor: "pointer" }}>Aceitar proposta</button>
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
    <div style={{ background: "#fff", border: `1px solid ${color.line}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 12px 40px -16px rgba(20,20,30,0.16)" }}>
      <div style={{ background: accent, color: "#fff", padding: "26px 30px 28px" }}>
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
            <span style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 34, letterSpacing: "-0.03em", color: accent, fontVariantNumeric: "tabular-nums" }}>{brl(total)}</span>
          </div>
        </>)}
        {chips.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
            {chips.map(([k, v]) => (
              <span key={k} style={{ fontSize: "12.5px", color: color.gray700, background: color.surface, borderRadius: 8, padding: "6px 10px" }}><b style={{ color: color.gray400, fontWeight: 600 }}>{k}:</b> {v}</span>
            ))}
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
    <div style={{ background: "#fff", border: `1px solid ${color.gray200}`, borderRadius: 6, padding: "30px 32px 32px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Mono doc={doc} size={30} radius={7} />
          <span style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" }}>{doc.company || "Seu estúdio"}</span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: accent }}>Proposta</div>
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
      <button onClick={onAccept} style={{ marginTop: 20, width: "100%", fontFamily: font.body, fontSize: 14.5, fontWeight: 600, color: color.ink, background: "#fff", border: `1.5px solid ${color.ink}`, padding: 12, borderRadius: 8, cursor: "pointer" }}>Aceitar proposta</button>
    </div>
  );
}

/* ---------- 4. COLORIDO ---------- */
function Colorido({ doc, accent, onAccept }) {
  const items = filledItems(doc);
  const total = sum(items);
  const dates = [["Início", doc.start], ["Entrega", doc.end]].filter(([, v]) => has(v));
  return (
    <div style={{ background: "#fff", border: `1px solid ${color.line}`, borderRadius: 18, overflow: "hidden", boxShadow: "0 16px 44px -18px rgba(20,20,30,0.28)" }}>
      <div style={{ background: `radial-gradient(120% 130% at 85% -10%, ${accent} 0%, ${accent}CC 55%, ${accent}99 100%)`, color: "#fff", padding: "30px 30px 34px" }}>
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
              <span style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 24, letterSpacing: "-0.02em", color: accent, fontVariantNumeric: "tabular-nums" }}>{brl(total)}</span>
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
        <button onClick={onAccept} style={{ width: "100%", fontFamily: font.body, fontSize: 15, fontWeight: 700, color: "#fff", background: accent, border: "none", padding: 14, borderRadius: 12, cursor: "pointer" }}>Aceitar proposta</button>
      </div>
    </div>
  );
}

export const DESIGNS = [
  { id: "minimal", name: "Minimal", tag: "Clean", accent: "#0A0A0A", Comp: Minimal },
  { id: "bold", name: "Bold", tag: "Impacto", accent: "#D97757", Comp: Bold },
  { id: "editorial", name: "Editorial", tag: "Formal", accent: "#2E7D51", Comp: Editorial },
  { id: "colorido", name: "Colorido", tag: "Vibrante", accent: "#6C48B0", Comp: Colorido },
];

export function ProposalDesign({ id, doc, accent, onAccept }) {
  const d = DESIGNS.find((x) => x.id === id) || DESIGNS[0];
  const Comp = d.Comp;
  return <Comp doc={doc} accent={accent || doc.accent || d.accent} onAccept={onAccept} />;
}
