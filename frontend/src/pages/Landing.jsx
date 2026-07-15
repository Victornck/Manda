import { useEffect, useRef } from "react";
import {
  LayoutGrid, PencilLine, Send, ArrowRight, Video, Share2, Code, Camera,
  Link as LinkIcon, Eye, BadgeCheck, Calculator, History, LineChart,
} from "lucide-react";
import { font, color } from "../theme.js";

export default function Landing({ go }) {
  const rootRef = useRef(null);
  const comoRef = useRef(null);
  const start = () => go && go("signup");

  // Scroll-reveal. Respeita quem pediu menos movimento (prefers-reduced-motion).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = root.querySelectorAll("[data-reveal]");

    if (reduce || typeof IntersectionObserver === "undefined") {
      targets.forEach((el) => { el.style.opacity = "1"; el.style.transform = "none"; });
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        const d = (parseInt(el.dataset.revealDelay || "0", 10) || 0) * 90;
        el.style.transitionDelay = d + "ms";
        el.style.opacity = "1";
        el.style.transform = "none";
        io.unobserve(el);
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });

    targets.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(20px)";
      el.style.transition = "opacity .65s cubic-bezier(.2,.7,.2,1), transform .65s cubic-bezier(.2,.7,.2,1)";
      io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  const seeHow = () => {
    if (comoRef.current) {
      const y = comoRef.current.getBoundingClientRect().top + window.scrollY - 20;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const steps = [
    { n: 1, title: "Escolhe o template", body: "Modelos prontos por nicho, já com escopo, itens e faixa de preço do seu mercado.", Icon: LayoutGrid },
    { n: 2, title: "Personaliza em minutos", body: "Um editor direto, no estilo documento. Você preenche escopo, preço e prazo sem burocracia.", Icon: PencilLine },
    { n: 3, title: "Envia e acompanha", body: "Manda o link e recebe um aviso quando o cliente abre e quando aceita. Nada de PDF perdido na caixa de entrada.", Icon: Send },
  ];

  const templates = [
    { tag: "Vídeo", title: "Produção de Vídeo", bg: "#FDF4F0", ink: "#B75C3C", Icon: Video },
    { tag: "Criação", title: "Design & Social Media", bg: "#EEF2FB", ink: "#3A5BB5", Icon: Share2 },
    { tag: "Código", title: "Desenvolvimento Web", bg: "#EAF5EE", ink: "#2E7D51", Icon: Code },
    { tag: "Foto", title: "Fotografia & Conteúdo", bg: "#F5EFFB", ink: "#6C48B0", Icon: Camera },
  ];

  const features = [
    { title: "Link compartilhável", body: "Nada de anexo em PDF. O cliente abre a proposta no navegador, do celular ou do computador.", soon: false, Icon: LinkIcon },
    { title: "Você sabe quando abriu", body: "Um aviso chega no instante em que o cliente abre a proposta. Chega de perguntar se ele viu.", soon: false, Icon: Eye },
    { title: "Aceite com um clique", body: "O cliente aprova ali mesmo, com data e hora registradas. Sem contrato à parte, sem burocracia.", soon: false, Icon: BadgeCheck },
    { title: "Calculadora de preço", body: "Sugestão de valor por tipo de serviço pra você parar de chutar o orçamento.", soon: false, Icon: Calculator },
    { title: "Follow-up automático", body: "Um lembrete sai sozinho quando o cliente some. Você fecha mais sem parecer insistente.", soon: true, Icon: History },
    { title: "Painel de conversão", body: "Quantas propostas você enviou, quantas fecharam e qual o seu ticket médio, tudo num lugar só.", soon: true, Icon: LineChart },
  ];

  const outcomes = [
    { quote: "Trocar a tarde inteira no Docs por uma proposta pronta em dez minutos.", label: "Menos tempo montando", initials: "1", bg: "#FDF4F0", ink: "#B75C3C" },
    { quote: "Saber a hora certa de dar o follow-up, porque você vê quando o cliente abriu.", label: "Mais respostas", initials: "2", bg: "#EEF2FB", ink: "#3A5BB5" },
    { quote: "Mandar uma proposta com cara de agência e fechar pelo valor cheio.", label: "Fechamento no preço", initials: "3", bg: "#EAF5EE", ink: "#2E7D51" },
  ];

  return (
    <div ref={rootRef} className="lp" style={{ fontFamily: font.body, color: color.ink }}>
      <style>{`
        .lp-hero{ display:grid; grid-template-columns:1fr 1fr; gap:56px; align-items:center; max-width:1120px; margin:0 auto; padding:80px 24px 72px; }
        .lp-grid-3{ display:grid; grid-template-columns:repeat(3,1fr); gap:24px; }
        .lp-grid-4{ display:grid; grid-template-columns:repeat(4,1fr); gap:20px; }
        .lp-features{ display:grid; grid-template-columns:repeat(3,1fr); gap:1px; }
        .lp-testi{ display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }

        .lp-h1{ font-family:${font.heading}; font-weight:900; font-size:clamp(42px,7.6vw,66px); line-height:0.98; letter-spacing:-0.035em; margin:0 0 20px; }
        .lp-h2{ font-family:${font.heading}; font-weight:700; font-size:clamp(28px,4.6vw,40px); line-height:1.08; letter-spacing:-0.03em; margin:0; }
        .lp-cta-h2{ font-family:${font.heading}; font-weight:900; font-size:clamp(30px,5.6vw,46px); line-height:1.04; letter-spacing:-0.035em; color:#fff; margin:0 0 16px; }

        .lp-btn{ font-family:${font.body}; font-weight:600; border:none; cursor:pointer; border-radius:11px; transition:background .16s ease, border-color .16s ease, box-shadow .16s ease, transform .16s ease; }
        .lp-btn:active{ transform:translateY(1px); }
        .lp-btn:focus-visible{ outline:2px solid ${color.accent}; outline-offset:3px; }
        .lp-btn-dark{ font-size:16px; color:#fff; background:${color.ink}; padding:15px 26px; }
        .lp-btn-dark:hover{ background:#262626; }
        .lp-btn-ghost{ font-size:16px; color:${color.ink900}; background:#fff; border:1px solid ${color.gray200}; padding:15px 24px; display:inline-flex; align-items:center; gap:8px; }
        .lp-btn-ghost:hover{ border-color:${color.ink}; background:${color.surface3}; }
        .lp-btn-ghost:hover .lp-arrow{ transform:translateX(3px); }
        .lp-arrow{ transition:transform .16s ease; }
        .lp-btn-white{ font-size:16.5px; color:${color.ink}; background:#fff; padding:16px 30px; border-radius:12px; }
        .lp-btn-white:hover{ background:#EDEDED; }

        .lp-tpl{ border:1px solid ${color.line}; border-radius:14px; overflow:hidden; background:#fff; transition:border-color .16s ease, box-shadow .16s ease, transform .16s ease; }
        .lp-tpl:hover{ border-color:${color.accent}; box-shadow:0 12px 30px -16px rgba(20,20,30,0.22); transform:translateY(-2px); }

        @media (max-width:900px){
          .lp-hero{ grid-template-columns:1fr; gap:40px; padding:56px 24px 8px; }
          .lp-grid-4{ grid-template-columns:repeat(2,1fr); }
        }
        @media (max-width:820px){
          .lp-grid-3{ grid-template-columns:1fr; }
          .lp-features{ grid-template-columns:1fr; }
          .lp-testi{ grid-template-columns:1fr; }
        }
        @media (max-width:520px){
          .lp-grid-4{ grid-template-columns:1fr; }
          .lp-sec{ padding-top:56px !important; padding-bottom:56px !important; }
        }
        @media (prefers-reduced-motion: reduce){
          .lp *, .lp *::before, .lp *::after{ animation-duration:.001ms !important; animation-iteration-count:1 !important; transition-duration:.001ms !important; }
          .lp [data-reveal]{ opacity:1 !important; transform:none !important; }
        }
      `}</style>

      {/* HERO */}
      <section style={{ position: "relative", overflow: "hidden", background: `radial-gradient(120% 90% at 85% -10%,${color.accentGlow} 0%,#FFFFFF 55%)` }}>
        <div className="lp-hero">
          <div style={{ animation: "mandaFadeUp .6s ease both" }}>
            <h1 className="lp-h1">
              Cria.<br />Envia.<br /><span style={{ color: color.accent }}>Fecha.</span>
            </h1>
            <p style={{ fontSize: "18.5px", lineHeight: 1.55, color: color.gray600, maxWidth: 430, margin: "0 0 32px" }}>
              Monte uma proposta com cara de agência em poucos minutos. Envie por link e veja na hora quando o cliente abre e quando aceita.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={start} className="lp-btn lp-btn-dark">Comece grátis</button>
              <button onClick={seeHow} className="lp-btn lp-btn-ghost">
                Ver como funciona <ArrowRight className="lp-arrow" size={16} strokeWidth={2.2} />
              </button>
            </div>
            <p style={{ fontSize: "13.5px", color: color.gray400, margin: "20px 0 0" }}>Não precisa de cartão. Você começa em menos de um minuto.</p>
          </div>

          <div style={{ animation: "mandaFadeUp .7s .1s ease both" }}>
            <div style={{ background: color.white, border: `1px solid ${color.line}`, borderRadius: 16, boxShadow: "0 24px 60px -20px rgba(20,20,30,0.22),0 8px 20px -12px rgba(20,20,30,0.12)", overflow: "hidden", animation: "mandaFloat 6s ease-in-out infinite" }}>
              <div style={{ height: 40, background: color.surface3, borderBottom: "1px solid #EEE", display: "flex", alignItems: "center", padding: "0 14px", gap: 7 }}>
                <Dot c="#F4B4A5" /><Dot c="#F6D9A8" /><Dot c="#C8E6C0" />
                <span style={{ marginLeft: 12, fontSize: 12, color: color.gray400, fontWeight: 500 }}>manda.app/p/proposta-viana</span>
              </div>
              <div style={{ padding: "26px 28px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                  <div>
                    <div style={{ width: 38, height: 38, borderRadius: 9, background: color.ink, color: color.white, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.heading, fontWeight: 900, marginBottom: 12 }}>R</div>
                    <div style={{ fontSize: 12, color: color.gray400, fontWeight: 500 }}>Proposta para</div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>Viana Café · Vídeo institucional</div>
                  </div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "11.5px", fontWeight: 600, color: color.accentInk, background: color.accentTint, border: `1px solid ${color.accentLine}`, padding: "5px 10px", borderRadius: 999 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: color.accent, animation: "mandaPulse 1.8s ease-in-out infinite" }} />Visualizada
                  </span>
                </div>
                <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em", marginBottom: 16 }}>Produção de vídeo institucional</div>
                <div style={{ border: "1px solid #EEE", borderRadius: 11, overflow: "hidden", marginBottom: 16 }}>
                  {[["Roteiro + direção", "R$ 1.800"], ["Diária de gravação", "R$ 2.400"], ["Edição + finalização", "R$ 1.600"]].map(([a, b], i, arr) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 15px", borderBottom: i < arr.length - 1 ? "1px solid #F2F2F2" : "none", fontSize: "13.5px" }}>
                      <span style={{ color: color.gray700 }}>{a}</span><span style={{ fontWeight: 600 }}>{b}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 3px", marginBottom: 20 }}>
                  <span style={{ fontSize: 13, color: color.gray500, fontWeight: 500 }}>Total</span>
                  <span style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 24, letterSpacing: "-0.02em" }}>R$ 5.800</span>
                </div>
                <button style={{ width: "100%", fontFamily: font.body, fontSize: 15, fontWeight: 600, color: color.white, background: color.accent, border: "none", padding: 13, borderRadius: 10, cursor: "pointer" }}>Aceitar proposta</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section ref={comoRef} className="lp-sec" style={{ background: color.surface2, borderTop: `1px solid ${color.line3}`, borderBottom: `1px solid ${color.line3}`, padding: "88px 24px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div data-reveal style={{ textAlign: "center", maxWidth: 620, margin: "0 auto 56px" }}>
            <h2 className="lp-h2">Da ideia ao aceite em três passos</h2>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: color.gray600, margin: "14px 0 0" }}>Do primeiro rascunho ao sim do cliente sem sair do Manda.</p>
          </div>
          <div className="lp-grid-3">
            {steps.map((s) => (
              <div key={s.n} data-reveal data-reveal-delay={s.n} style={{ background: color.white, border: `1px solid ${color.line}`, borderRadius: 14, padding: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                  <span style={{ width: 34, height: 34, borderRadius: 9, background: color.ink, color: color.white, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.heading, fontWeight: 900, fontSize: 15 }}>{s.n}</span>
                  <span style={{ color: color.accent, display: "flex" }}><s.Icon size={22} strokeWidth={1.9} /></span>
                </div>
                <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 20, letterSpacing: "-0.01em", marginBottom: 9 }}>{s.title}</div>
                <p style={{ fontSize: 15, lineHeight: 1.55, color: color.gray600, margin: 0 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TEMPLATES POR NICHO */}
      <section className="lp-sec" style={{ padding: "88px 24px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div data-reveal style={{ maxWidth: 620, marginBottom: 44 }}>
            <h2 className="lp-h2">Feitos pro seu mercado</h2>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: color.gray600, margin: "14px 0 0" }}>Nada de modelo genérico. Escolhe o seu nicho e começa com escopo, itens e preço já no lugar.</p>
          </div>
          <div className="lp-grid-4">
            {templates.map((t, i) => (
              <div key={i} data-reveal data-reveal-delay={i} className="lp-tpl">
                <div style={{ height: 132, padding: 16, position: "relative", overflow: "hidden", background: t.bg }}>
                  <span style={{ position: "absolute", right: -14, bottom: -14, color: t.ink, opacity: 0.16, display: "flex" }}><t.Icon size={120} strokeWidth={1.4} /></span>
                  <div style={{ width: 52, height: 8, borderRadius: 4, background: t.ink, opacity: 0.9, marginBottom: 8 }} />
                  <div style={{ width: 82, height: 6, borderRadius: 3, background: t.ink, opacity: 0.35, marginBottom: 16 }} />
                  <div style={{ width: "100%", height: 5, borderRadius: 3, background: t.ink, opacity: 0.18, marginBottom: 7 }} />
                  <div style={{ width: "75%", height: 5, borderRadius: 3, background: t.ink, opacity: 0.18 }} />
                </div>
                <div style={{ padding: "16px 16px 18px", borderTop: "1px solid #F1F1F1" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: color.gray400 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.ink }} />{t.tag}
                  </span>
                  <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 16, marginTop: 10 }}>{t.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="lp-sec" style={{ background: color.ink, color: color.white, padding: "92px 24px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div data-reveal style={{ maxWidth: 620, marginBottom: 52 }}>
            <h2 className="lp-h2" style={{ color: color.white }}>Tudo que uma boa proposta precisa</h2>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: color.gray400, margin: "14px 0 0" }}>Cada recurso existe pra você fechar mais rápido e com menos esforço.</p>
          </div>
          <div className="lp-features" style={{ background: color.ink800, border: `1px solid ${color.ink800}`, borderRadius: 16, overflow: "hidden" }}>
            {features.map((f, i) => (
              <div key={i} data-reveal data-reveal-delay={i} style={{ background: color.ink, padding: "30px 26px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <span style={{ color: color.accent, display: "flex" }}><f.Icon size={22} strokeWidth={1.9} /></span>
                  {f.soon && <span style={{ fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: color.gray300, border: `1px solid ${color.gray700}`, padding: "3px 8px", borderRadius: 999 }}>Em breve</span>}
                </div>
                <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 18, letterSpacing: "-0.01em", marginBottom: 8 }}>{f.title}</div>
                <p style={{ fontSize: "14.5px", lineHeight: 1.55, color: color.gray400, margin: 0 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BETA / RESULTADOS */}
      <section className="lp-sec" style={{ padding: "88px 24px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div data-reveal style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 48px" }}>
            <h2 className="lp-h2">Feito pra você parecer agência</h2>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: color.gray600, margin: "14px 0 0" }}>O Manda está em beta. Estes são os resultados que ele foi desenhado pra te dar.</p>
          </div>
          <div className="lp-testi">
            {outcomes.map((t, i) => (
              <div key={i} data-reveal data-reveal-delay={i} style={{ border: `1px solid ${color.line}`, borderRadius: 14, padding: 26, background: color.white }}>
                <p style={{ fontSize: "15.5px", lineHeight: 1.6, color: color.ink800, margin: "0 0 22px" }}>{t.quote}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 40, height: 40, borderRadius: "50%", background: t.bg, color: t.ink, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.heading, fontWeight: 700, fontSize: 15 }}>{t.initials}</span>
                  <div style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: color.gray400 }}>{t.label}</div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", fontSize: "13.5px", color: color.gray400, margin: "32px 0 0" }}>Entre no beta e seja um dos primeiros a mandar.</p>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ padding: "20px 24px 96px" }}>
        <div data-reveal style={{ maxWidth: 1120, margin: "0 auto", background: "radial-gradient(110% 130% at 15% 0%,#2A1712 0%,#0A0A0A 60%)", borderRadius: 24, padding: "72px 40px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          <h2 className="lp-cta-h2">Chega de proposta<br />no Google Docs.</h2>
          <p style={{ fontSize: 18, color: color.gray300, maxWidth: 460, margin: "0 auto 32px" }}>Seu próximo cliente merece uma proposta à altura do seu trabalho.</p>
          <button onClick={start} className="lp-btn lp-btn-white">Comece grátis</button>
          <p style={{ fontSize: "13.5px", color: color.gray500, margin: "18px 0 0" }}>Grátis no plano inicial. Você cancela quando quiser.</p>
        </div>
      </section>
    </div>
  );
}

const Dot = ({ c }) => <span style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />;
