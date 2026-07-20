import { font, color } from "../theme.js";

// Layout base dos documentos legais (Termos e Privacidade).
export default function LegalDoc({ title, updated, sections }) {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "56px 24px 96px", fontFamily: font.body, color: color.ink }}>
      <h1 style={{ fontFamily: font.heading, fontWeight: 900, fontSize: "clamp(32px,5vw,44px)", letterSpacing: "-0.03em", lineHeight: 1.05, margin: "0 0 10px" }}>{title}</h1>
      <div style={{ fontSize: "13.5px", color: color.gray400, marginBottom: 36 }}>Última atualização: {updated}</div>
      {sections.map((s, i) => (
        <section key={i} style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 19, letterSpacing: "-0.01em", margin: "0 0 10px" }}>{s.h}</h2>
          {s.p.map((para, j) => (
            <p key={j} style={{ fontSize: "15.5px", lineHeight: 1.7, color: color.gray700, margin: "0 0 12px" }}>{para}</p>
          ))}
        </section>
      ))}
    </div>
  );
}
