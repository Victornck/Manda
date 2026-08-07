import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { font, color } from "../theme.js";
import ReportProblem from "./ReportProblem.jsx";

// Nav + footer das páginas públicas (Landing e Pricing).
// Equivale ao shell de marketing do Manda.dc.html.
function Logo({ dark }) {
  return (
    <img
      src={dark ? "/logo-horizontal-white.svg" : "/logo-horizontal.svg"}
      alt="Manda"
      style={{ height: 28, width: "auto", display: "block" }}
    />
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
        <style>{`
          .ml-nav{ display:flex; align-items:center; gap:8px; }
          .ml-nav a{ white-space:nowrap; }
          @media (max-width:560px){
            .ml-head{ padding:0 16px !important; }
            .ml-nav{ gap:2px; }
            .ml-nav a{ font-size:13.5px !important; padding:8px 9px !important; }
            .ml-cta{ padding:8px 12px !important; }
          }
          @media (max-width:380px){
            .ml-nav a.ml-precos{ display:none; }
          }
          /* light -> bold no hover, sem "pulo": um clone bold invisível reserva a largura */
          .ml-flink{ display:inline-flex; flex-direction:column; align-items:flex-start; width:fit-content; font-weight:300; color:${color.gray400}; text-decoration:none; transition:color .14s ease; }
          .ml-flink::after{ content:attr(data-label); font-weight:700; height:0; overflow:hidden; visibility:hidden; pointer-events:none; }
          .ml-flink:hover{ font-weight:700; color:#fff; }
        `}</style>
        <div className="ml-head" style={{ maxWidth: 1120, margin: "0 auto", height: 64, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <Link
            to="/"
            style={{ flex: "none" }}
            aria-label="Manda, ir para o topo"
            onClick={(e) => {
              // Já na home: não recarrega a rota, só sobe suave. Em outra página,
              // deixa o Link navegar pra home normalmente.
              if (window.location.pathname === "/") {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
          ><Logo /></Link>
          <nav className="ml-nav">
            <Link to="/precos" className="ml-precos" style={{ fontSize: "14.5px", fontWeight: 500, color: color.gray700, padding: "8px 12px", borderRadius: 8 }}>Preços</Link>
            <Link to="/entrar" style={{ fontSize: "14.5px", fontWeight: 500, color: color.gray700, padding: "8px 12px", borderRadius: 8 }}>Entrar</Link>
            <Link to="/criar-conta" className="ml-cta" style={{ fontSize: "14.5px", fontWeight: 600, color: color.white, background: color.ink, padding: "9px 16px", borderRadius: 9 }}>Começar agora</Link>
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
            <FooterCol title="Produto" links={[["Como funciona", "/#como-funciona"], ["Preços", "/precos"], ["Por que o Manda", "/#por-que"]]} />
            <FooterCol title="Conta" links={[["Login", "/entrar"], ["Criar conta", "/criar-conta"]]} />
            <FooterCol title="Legal" links={[["Termos de Uso", "/termos"], ["Política de Privacidade", "/privacidade"]]} />
            <div>
              <div style={{ fontFamily: font.heading, fontSize: 12.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: color.white, marginBottom: 14 }}>Contato</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                <ReportProblem
                  title="Fale com o suporte"
                  sentTitle="Mensagem enviada"
                  submitLabel="Enviar"
                  promptLabel="Como podemos ajudar?"
                  promptPlaceholder="Conte o que você precisa: dúvida, cobrança, sugestão…"
                  requireEmail
                  renderTrigger={(open) => (
                    <button type="button" onClick={open} className="ml-flink" data-label="Suporte" style={{ fontSize: 14, background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: font.body, textAlign: "left" }}>Suporte</button>
                  )}
                />
              </div>
            </div>
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
      <div style={{ fontFamily: font.heading, fontSize: 12.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: color.white, marginBottom: 14 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {links.map(([label, to], i) => (
          to.includes("#")
            ? <ScrollLink key={i} to={to} label={label} />
            : to.startsWith("mailto:")
              ? <a key={i} href={to} className="ml-flink" data-label={label} style={{ fontSize: 14 }}>{label}</a>
              : <Link key={i} to={to} className="ml-flink" data-label={label} style={{ fontSize: 14 }}>{label}</Link>
        ))}
      </div>
    </div>
  );
}

// Link de âncora com rolagem SUAVE. Na mesma página, só rola até a seção. Em
// outra página, navega via SPA (sem recarregar, sem flash branco) e o destino
// rola ao montar. Respeita prefers-reduced-motion (rola na hora, sem animar).
function ScrollLink({ to, label }) {
  const navigate = useNavigate();
  const location = useLocation();
  const hi = to.indexOf("#");
  const path = to.slice(0, hi) || "/";
  const id = to.slice(hi + 1);
  const onClick = (e) => {
    e.preventDefault();
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scrollToId = () => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    };
    if (location.pathname === path) {
      scrollToId();
    } else {
      navigate(to); // troca de página sem recarregar; a Landing rola ao montar
      requestAnimationFrame(() => setTimeout(scrollToId, 120)); // reforço p/ variação de timing
    }
  };
  return <a href={to} onClick={onClick} className="ml-flink" data-label={label} style={{ fontSize: 14 }}>{label}</a>;
}
