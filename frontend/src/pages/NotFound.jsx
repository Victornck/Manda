import { font, color } from "../theme.js";

export default function NotFound({ go }) {
  const home = () => (go ? go("landing") : (window.location.href = "/"));
  const pricing = () => (go ? go("pricing") : (window.location.href = "/precos"));
  const mark = { width: 34, height: 34, borderRadius: 9, background: color.ink, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.heading, fontWeight: 900, fontSize: 18 };
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24, fontFamily: font.body, color: color.ink, background: color.surface2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 30 }}>
        <span style={mark}>M</span>
        <span style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 20, letterSpacing: "-0.02em" }}>Manda</span>
      </div>
      <div style={{ fontFamily: font.heading, fontWeight: 900, fontSize: "clamp(72px,16vw,120px)", letterSpacing: "-0.04em", lineHeight: 1 }}>
        4<span style={{ color: color.accent }}>0</span>4
      </div>
      <h1 style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 24, letterSpacing: "-0.02em", margin: "10px 0 8px" }}>Essa página não existe</h1>
      <p style={{ fontSize: 16, lineHeight: 1.55, color: color.gray500, maxWidth: 420, margin: "0 0 28px" }}>O link pode estar quebrado ou a página foi movida. Vamos te levar de volta.</p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={home} style={{ fontFamily: font.body, fontWeight: 600, fontSize: 15, color: "#fff", background: color.ink, border: "none", borderRadius: 11, padding: "13px 22px", cursor: "pointer" }}>Voltar ao início</button>
        <button onClick={pricing} style={{ fontFamily: font.body, fontWeight: 600, fontSize: 15, color: color.ink900, background: "#fff", border: `1px solid ${color.gray200}`, borderRadius: 11, padding: "13px 22px", cursor: "pointer" }}>Ver planos</button>
      </div>
    </div>
  );
}
