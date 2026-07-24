import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Plus } from "lucide-react";
import { font, color } from "../theme.js";
import { api, getToken } from "../lib/api.js";

export default function Pricing({ go }) {
  const [billing, setBilling] = useState("monthly");
  const annual = billing === "annual";
  const navigate = useNavigate();
  const signup = () => go && go("signup");
  const subscribe = async (planKey) => {
    const interval = annual ? "year" : "month";
    if (getToken()) {
      try {
        const { url } = await api.checkout(planKey, interval);
        window.location.href = url; // gateway do Stripe
        return;
      } catch { /* não logado / erro: manda pro cadastro com o plano pendente */ }
    }
    navigate(`/criar-conta?plan=${planKey}&interval=${interval}`);
  };

  const toggleBase = { fontFamily: font.body, fontSize: "14.5px", fontWeight: 600, padding: "9px 18px", borderRadius: 8, border: "none", cursor: "pointer", display: "flex", alignItems: "center", transition: "background .15s,color .15s" };
  const tActive = { ...toggleBase, background: color.white, color: color.ink, boxShadow: "0 1px 2px rgba(0,0,0,0.08)" };
  const tIdle = { ...toggleBase, background: "transparent", color: color.gray500 };

  const plans = [
    {
      name: "Básico", planKey: "basic", tagline: "Para começar a mandar propostas com cara profissional.",
      price: annual ? "R$11" : "R$12", period: "/mês", note: annual ? "R$132/ano · cobrado anualmente" : "cobrado mensalmente", cta: "Assinar Básico", variant: "ghost",
      popular: false, titleColor: color.ink, subColor: color.gray500, featColor: color.gray700, divider: "#EEE", checkColor: color.ink,
      cardStyle: { position: "relative", background: color.white, border: `1px solid ${color.line}`, borderRadius: 16, padding: "30px 26px" },
      features: ["5 propostas por mês", "Acesso aos templates básicos", "Link compartilhável", "Aceite com um clique"],
    },
    {
      name: "Pro", planKey: "pro", tagline: "Para quem vive de proposta e quer fechar mais.",
      price: annual ? "R$26" : "R$29", period: "/mês", note: annual ? "R$312/ano · cobrado anualmente" : "cobrado mensalmente", cta: "Assinar Pro", variant: "accent",
      popular: true, titleColor: color.white, subColor: color.gray400, featColor: color.gray200, divider: color.ink800, checkColor: "#E9967B",
      cardStyle: { position: "relative", background: color.ink, color: color.white, border: `1px solid ${color.ink}`, borderRadius: 16, padding: "30px 26px", boxShadow: "0 22px 50px -20px rgba(217,119,87,0.4)", transform: "scale(1.03)" },
      features: ["25 propostas por mês", "Todos os templates", "Sem marca d’água", "Notificação de visualização", "Aceite com um clique", "Calculadora de preço"],
    },
    {
      name: "Business", planKey: "business", tagline: "Para quem quer marca própria e automação.",
      price: annual ? "R$87" : "R$97", period: "/mês", note: annual ? "R$1.044/ano · cobrado anualmente" : "cobrado mensalmente", cta: "Assinar Business", variant: "dark",
      popular: false, titleColor: color.ink, subColor: color.gray500, featColor: color.gray700, divider: "#EEE", checkColor: color.ink,
      cardStyle: { position: "relative", background: color.white, border: `1px solid ${color.line}`, borderRadius: 16, padding: "30px 26px" },
      features: ["Propostas ilimitadas", "Todos os templates", "Domínio personalizado no link", "Dashboard de conversão", "Suporte prioritário"],
    },
  ];

  const faqs = [
    { q: "Posso cancelar quando quiser?", a: "Pode, a qualquer momento, direto pelo painel. Você continua com acesso até o fim do período já pago e não paga nenhuma multa." },
    { q: "Tem contrato ou fidelidade?", a: "Nenhum. É mês a mês, ou ano a ano se você escolher o anual. Sem letra miúda e sem período mínimo." },
    { q: "Aceita PIX?", a: "Sim. Você paga com PIX, cartão de crédito ou boleto. No PIX o acesso libera na hora." },
    { q: "Como funcionam os limites de cada plano?", a: "Você envia até 5 propostas por mês no Básico e 25 no Pro; no Business são ilimitadas. Rascunhos não contam, só as propostas concluídas. Chegou no limite ou quer todos os templates? É só subir de plano." },
    { q: "Preciso saber design para usar?", a: "Não. Os templates já vêm prontos e bonitos por nicho. Você só preenche escopo, preço e prazo. O resto o Manda cuida." },
  ];

  return (
    <div className="pr" style={{ fontFamily: font.body, color: color.ink }}>
      <style>{`
        .manda-faq summary::-webkit-details-marker{ display:none; }
        .manda-faq summary{ list-style:none; }
        .manda-faq summary:focus-visible{ outline:2px solid ${color.accent}; outline-offset:2px; border-radius:6px; }
        .manda-faq[open] .manda-plus{ transform:rotate(45deg); }
        .manda-plus{ transition:transform .2s ease; }

        .pr-h1{ font-size:clamp(34px,6vw,52px); }
        .pr-faq-h2{ font-size:clamp(26px,4vw,34px); }
        .pr-cta-h2{ font-size:clamp(28px,5vw,40px); }

        .pr-toggle:focus-visible{ outline:2px solid ${color.accent}; outline-offset:2px; }

        .pr-btn{ width:100%; font-family:${font.body}; font-weight:600; font-size:15px; border:none; cursor:pointer; border-radius:10px; padding:13px; transition:background .16s ease, border-color .16s ease, box-shadow .16s ease, transform .16s ease; }
        .pr-btn:active{ transform:translateY(1px); }
        .pr-btn:focus-visible{ outline:2px solid ${color.accent}; outline-offset:2px; }
        .pr-btn-ghost{ color:${color.ink900}; background:#fff; border:1px solid ${color.gray200}; }
        .pr-btn-ghost:hover{ border-color:${color.ink}; background:${color.surface3}; }
        .pr-btn-accent{ color:#fff; background:${color.accent}; }
        .pr-btn-accent:hover{ background:${color.accentHover}; }
        .pr-btn-dark{ color:#fff; background:${color.ink}; }
        .pr-btn-dark:hover{ background:#262626; }

        .pr-btn-white{ font-family:${font.body}; font-weight:600; font-size:16.5px; color:${color.ink}; background:#fff; border:none; padding:16px 30px; border-radius:12px; cursor:pointer; transition:background .16s ease; }
        .pr-btn-white:hover{ background:#EDEDED; }
        .pr-btn-white:focus-visible{ outline:2px solid #fff; outline-offset:3px; }

        .pr-card-light{ transition:border-color .16s ease, box-shadow .16s ease, transform .16s ease; }
        .pr-card-light:hover{ border-color:${color.accent}; box-shadow:0 12px 30px -16px rgba(20,20,30,0.18); transform:translateY(-2px); }

        @media (max-width:900px){
          .pr-plans{ grid-template-columns:1fr !important; max-width:420px !important; }
          .pr-pro{ transform:none !important; }
        }
        @media (prefers-reduced-motion: reduce){
          .pr *, .pr *::before, .pr *::after{ transition-duration:.001ms !important; }
          .manda-faq[open] .manda-plus{ transform:rotate(45deg); }
        }
      `}</style>

      {/* HERO */}
      <section style={{ background: `radial-gradient(120% 80% at 50% -20%,${color.accentGlow} 0%,#FFFFFF 55%)`, padding: "76px 24px 40px", textAlign: "center" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: color.accent, marginBottom: 16 }}>Preços</div>
          <h1 className="pr-h1" style={{ fontFamily: font.heading, fontWeight: 900, lineHeight: 1.02, letterSpacing: "-0.035em", margin: "0 0 16px" }}>Simples. Sem surpresa.</h1>
          <p style={{ fontSize: "18.5px", lineHeight: 1.55, color: color.gray600, maxWidth: 520, margin: "0 auto 32px" }}>Escolha o plano e comece agora. Mude ou cancele quando quiser, sem multa.</p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: color.surface, borderRadius: 11, padding: 4 }}>
            <button onClick={() => setBilling("monthly")} className="pr-toggle" style={annual ? tIdle : tActive}>Mensal</button>
            <button onClick={() => setBilling("annual")} className="pr-toggle" style={annual ? tActive : tIdle}>
              Anual <span style={{ fontSize: "11.5px", fontWeight: 600, color: color.accentInk, background: color.accentTint, padding: "2px 7px", borderRadius: 999, marginLeft: 6 }}>-10%</span>
            </button>
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section style={{ padding: "20px 24px 84px" }}>
        <div className="pr-plans" style={{ maxWidth: 1080, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 22, alignItems: "start" }}>
          {plans.map((p, i) => (
            <div key={i} className={p.popular ? "pr-pro" : "pr-card-light"} style={p.cardStyle}>
              {p.popular && <div style={{ position: "absolute", top: 16, right: 16, fontSize: "11.5px", fontWeight: 600, letterSpacing: "0.03em", color: color.white, background: color.accent, padding: "5px 11px", borderRadius: 999 }}>Mais popular</div>}
              <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 20, letterSpacing: "-0.01em", marginBottom: 6, color: p.titleColor }}>{p.name}</div>
              <p style={{ fontSize: 14, lineHeight: 1.5, color: p.subColor, margin: "0 0 22px", minHeight: 42 }}>{p.tagline}</p>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, marginBottom: 4 }}>
                <span style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 46, lineHeight: 1, letterSpacing: "-0.03em", color: p.titleColor }}>{p.price}</span>
                <span style={{ fontSize: 15, color: p.subColor, marginBottom: 8 }}>{p.period}</span>
              </div>
              <div style={{ fontSize: 13, color: p.subColor, minHeight: 20, marginBottom: 22 }}>{p.note}</div>
              <button onClick={() => subscribe(p.planKey)} className={`pr-btn pr-btn-${p.variant}`}>{p.cta}</button>
              <div style={{ height: 1, background: p.divider, margin: "24px 0" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                {p.features.map((f, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: "14.5px", lineHeight: 1.4, color: p.featColor }}>
                    <span style={{ flex: "none", marginTop: 1, display: "flex" }}><Check size={17} color={p.checkColor} strokeWidth={2.4} /></span>{f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ background: color.surface2, borderTop: `1px solid ${color.line3}`, padding: "80px 24px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <h2 className="pr-faq-h2" style={{ fontFamily: font.heading, fontWeight: 700, letterSpacing: "-0.025em", textAlign: "center", margin: "0 0 40px" }}>Perguntas frequentes</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {faqs.map((f, i) => (
              <details key={i} className="manda-faq" style={{ background: color.white, border: `1px solid ${color.line}`, borderRadius: 12, padding: "2px 20px" }}>
                <summary style={{ cursor: "pointer", padding: "18px 0", fontSize: 16, fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                  {f.q}
                  <span className="manda-plus" style={{ flex: "none", display: "flex" }}><Plus size={20} color={color.accent} strokeWidth={2.2} /></span>
                </summary>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: color.gray600, margin: "0 0 18px" }}>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ padding: "20px 24px 88px", background: color.white }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", background: color.darkGradient, borderRadius: 24, padding: "64px 40px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          <h2 className="pr-cta-h2" style={{ fontFamily: font.heading, fontWeight: 900, lineHeight: 1.04, letterSpacing: "-0.03em", color: color.white, margin: "0 0 14px" }}>Escolha seu plano e comece hoje.</h2>
          <p style={{ fontSize: 18, lineHeight: 1.55, color: color.gray300, maxWidth: 460, margin: "0 auto 32px" }}>Crie a conta em um minuto. Mude ou cancele quando quiser, sem multa.</p>
          <button onClick={signup} className="pr-btn-white">Criar minha conta</button>
        </div>
      </section>
    </div>
  );
}
