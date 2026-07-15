import { Outlet, Link } from "react-router-dom";
import { font, color } from "../theme.js";

// Nav + footer das páginas públicas (Landing e Pricing).
// Equivale ao shell de marketing do Manda.dc.html.
function Logo({ dark }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <span
        style={{
          width: 28, height: 28, borderRadius: 8,
          background: dark ? color.white : color.ink,
          color: dark ? color.ink : color.white,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: font.heading, fontWeight: 900, fontSize: 17, lineHeight: 1,
        }}
      >M</span>
      <span style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 19, letterSpacing: "-0.02em" }}>Manda</span>
    </span>
  );
}

export default function MarketingLayout() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "rgba(255,255,255,0.82)",
          backdropFilter: "saturate(180%) blur(12px)",
          borderBottom: `1px solid ${color.line3}`,
        }}
      >
        <div style={{ maxWidth: 1120, margin: "0 auto", height: 64, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link to="/"><Logo /></Link>
          <nav style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link to="/precos" style={{ fontSize: "14.5px", fontWeight: 500, color: color.gray700, padding: "8px 12px", borderRadius: 8 }}>Preços</Link>
            <Link to="/entrar" style={{ fontSize: "14.5px", fontWeight: 500, color: color.gray700, padding: "8px 12px", borderRadius: 8 }}>Entrar</Link>
            <Link to="/criar-conta" style={{ fontSize: "14.5px", fontWeight: 600, color: color.white, background: color.ink, padding: "9px 16px", borderRadius: 9 }}>Comece grátis</Link>
          </nav>
        </div>
      </header>

      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Outlet />
      </main>

      <footer style={{ background: color.ink, color: color.white, padding: "56px 24px 40px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: 48, justifyContent: "space-between" }}>
          <div style={{ maxWidth: 280 }}>
            <div style={{ marginBottom: 14 }}><Logo dark /></div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: color.gray400, margin: 0 }}>
              Propostas comerciais que fecham negócio. Feito pra quem trabalha por conta.
            </p>
          </div>
          <div style={{ display: "flex", gap: 56, flexWrap: "wrap" }}>
            <FooterCol title="Produto" links={[["Como funciona", "/"], ["Preços", "/precos"], ["Comece grátis", "/criar-conta"]]} />
            <FooterCol title="Conta" links={[["Login", "/entrar"], ["Contato", "#"]]} />
            <FooterCol title="Social" links={[["Instagram", "#"], ["LinkedIn", "#"]]} />
          </div>
        </div>
        <div style={{ maxWidth: 1120, margin: "40px auto 0", paddingTop: 24, borderTop: `1px solid ${color.ink800}`, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: 13, color: color.gray500 }}>© 2026 Manda</span>
          <span style={{ fontSize: 13, color: color.gray500 }}>Feito no Brasil 🇧🇷 para freelancers</span>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: color.gray500, marginBottom: 14 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {links.map(([label, to], i) => (
          <Link key={i} to={to} style={{ fontSize: 14, color: color.gray300 }}>{label}</Link>
        ))}
      </div>
    </div>
  );
}
