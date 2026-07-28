import { Component } from "react";
import { font, color } from "../theme.js";

// Captura erros de renderização e mostra uma tela amigável em vez de tela branca.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("Erro na aplicação:", error, info);
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    const mark = { width: 34, height: 34, borderRadius: 9, background: color.ink, display: "flex", alignItems: "center", justifyContent: "center" };
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24, fontFamily: font.body, color: color.ink, background: color.surface2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 30 }}>
          <span style={mark}><img src="/logo-mark-white.svg" alt="" style={{ width: "60%", height: "60%", display: "block" }} /></span>
          <span style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 20, letterSpacing: "-0.02em" }}>Manda</span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: color.accent, marginBottom: 12 }}>Ops</div>
        <h1 style={{ fontFamily: font.heading, fontWeight: 900, fontSize: "clamp(28px,5vw,40px)", letterSpacing: "-0.03em", lineHeight: 1.05, margin: "0 0 10px" }}>Algo deu errado</h1>
        <p style={{ fontSize: 16, lineHeight: 1.55, color: color.gray500, maxWidth: 440, margin: "0 0 28px" }}>Tivemos um problema ao carregar esta parte do app. Tente recarregar. Se continuar, volte em alguns instantes.</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <button onClick={() => window.location.reload()} style={{ fontFamily: font.body, fontWeight: 600, fontSize: 15, color: "#fff", background: color.ink, border: "none", borderRadius: 11, padding: "13px 22px", cursor: "pointer" }}>Recarregar</button>
          <a href="/" style={{ fontFamily: font.body, fontWeight: 600, fontSize: 15, color: color.ink900, background: "#fff", border: `1px solid ${color.gray200}`, borderRadius: 11, padding: "13px 22px", display: "inline-flex", alignItems: "center" }}>Ir para o início</a>
        </div>
      </div>
    );
  }
}
