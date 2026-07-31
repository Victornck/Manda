import { useEffect, useRef, useState } from "react";
import {
  LayoutGrid, PencilLine, Send, ArrowRight, Video, Share2, Code, Camera,
  Link as LinkIcon, Eye, BadgeCheck, Calculator, History, LineChart, Clock, X,
} from "lucide-react";
import { font, color } from "../theme.js";
import { ProposalDesign, SAMPLE_DOC } from "../templates/designs.jsx";

// 100 termos/nichos que o Manda atende (para o modal "SEO").
const SEO_KEYWORDS = [
  "proposta comercial", "modelo de proposta comercial", "modelo de proposta", "proposta para cliente",
  "orçamento para cliente", "modelo de orçamento", "modelo de orçamento profissional", "gerador de proposta",
  "criar proposta online", "proposta profissional", "proposta de prestação de serviço", "orçamento de serviço",
  "software de proposta", "sistema de orçamento online", "plataforma de propostas", "proposta por link",
  "proposta online", "proposta digital", "enviar proposta por link", "aceitar proposta online",
  "proposta com aceite digital", "assinatura de proposta online", "template de orçamento", "modelo de orçamento editável",
  "modelo de proposta editável", "modelo de proposta pronta", "exemplo de proposta comercial", "exemplo de proposta de serviço",
  "como fazer uma proposta comercial", "como fazer um orçamento profissional", "precificação para freelancer", "quanto cobrar como freelancer",
  "tabela de preços freelancer", "calculadora de preço freelancer", "proposta para freelancer", "ferramenta para freelancer",
  "orçamento para freelancer", "proposta freelancer brasil", "proposta para MEI", "orçamento para MEI",
  "proposta para pequenos negócios", "proposta para agência", "proposta para videomaker", "orçamento de produção de vídeo",
  "proposta de vídeo institucional", "orçamento de edição de vídeo", "proposta para produtora de vídeo", "proposta para designer",
  "orçamento de design gráfico", "proposta de identidade visual", "proposta de criação de logo", "proposta para social media",
  "orçamento de social media", "proposta de gestão de redes sociais", "proposta para community manager", "proposta de marketing digital",
  "orçamento de tráfego pago", "proposta para desenvolvedor", "orçamento de desenvolvimento web", "proposta de criação de site",
  "orçamento de site", "proposta para programador", "proposta para fotógrafo", "orçamento de fotografia",
  "proposta de ensaio fotográfico", "proposta para casamento", "orçamento de casamento", "proposta para wedding",
  "proposta para redator", "proposta de copywriting", "proposta para consultor", "proposta de consultoria",
  "proposta para arquiteto", "orçamento de projeto de interiores", "proposta para ilustrador", "proposta para músico",
  "proposta para produtor de eventos", "proposta com escopo e valores", "escopo de projeto", "proposta de projeto",
  "proposta que converte", "proposta que fecha negócio", "proposta com cara de agência", "proposta personalizada",
  "proposta com logo e capa", "proposta bonita para cliente", "alternativa ao PDF para proposta", "substituir google docs proposta",
  "proposta sem word", "orçamento sem excel", "rastrear proposta enviada", "saber quando o cliente abriu a proposta",
  "notificação de proposta visualizada", "acompanhar propostas enviadas", "fechar mais clientes freelancer", "aumentar taxa de aceite de propostas",
  "modelo de orçamento word", "modelo de orçamento excel", "proposta de trabalho freelancer", "orçamento profissional online",
];

export default function Landing({ go }) {
  const rootRef = useRef(null);
  const comoRef = useRef(null);
  const start = () => go && go("signup");
  // Demo interativa do hero: viewed -> loading -> accepted
  const [demoStatus, setDemoStatus] = useState("viewed");
  const acceptDemo = () => {
    if (demoStatus !== "viewed") return;
    setDemoStatus("loading");
    setTimeout(() => setDemoStatus("accepted"), 1400);
  };
  const [showSeo, setShowSeo] = useState(false);
  useEffect(() => {
    if (!showSeo) return;
    const onKey = (e) => { if (e.key === "Escape") setShowSeo(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showSeo]);

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
    { n: 2, title: "Personaliza em minutos", body: "Um editor direto, no estilo documento. Você preenche escopo, preço e prazo enquanto a prévia se monta do lado.", Icon: PencilLine },
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
    { title: "Aceite com um clique", body: "O cliente aprova ali mesmo, com data e hora registradas. Sem imprimir, assinar e escanear.", soon: false, Icon: BadgeCheck },
    { title: "Calculadora de preço", body: "Sugestão de valor por tipo de serviço pra você parar de chutar o orçamento.", soon: false, Icon: Calculator },
    { title: "Painel de conversão", body: "Quantas propostas você enviou, quantas fecharam e qual o seu ticket médio, tudo num lugar só.", soon: false, Icon: LineChart },
    { title: "Follow-up automático", body: "Um lembrete sai sozinho quando o cliente some. Você fecha mais sem parecer insistente.", soon: true, Icon: History },
  ];

  const outcomes = [
    { title: "Menos tempo montando", quote: "Troque a tarde inteira no Docs por uma proposta pronta em dez minutos.", Icon: Clock },
    { title: "Mais respostas do cliente", quote: "Saiba a hora certa do follow-up: você vê quando ele abre a proposta.", Icon: Eye },
    { title: "Fechamento no preço cheio", quote: "Proposta bem apresentada segura o preço. Cliente que confia não pede desconto.", Icon: BadgeCheck },
  ];

  const audiences = [
    { name: "Produção de vídeo", desc: "Institucional, comercial e social.", Icon: Video, bg: "#FDF4F0", ink: "#B75C3C" },
    { name: "Design & identidade", desc: "Logo, identidade visual e peças.", Icon: PencilLine, bg: "#EEF2FB", ink: "#3A5BB5" },
    { name: "Social media", desc: "Gestão de redes e conteúdo.", Icon: Share2, bg: "#EAF5EE", ink: "#2E7D51" },
    { name: "Desenvolvimento", desc: "Sites, apps e sistemas.", Icon: Code, bg: "#F5EFFB", ink: "#6C48B0" },
    { name: "Fotografia", desc: "Ensaios, eventos e produtos.", Icon: Camera, bg: "#FBEFF4", ink: "#C6407E" },
    { name: "Marketing digital", desc: "Tráfego, campanhas e performance.", Icon: LineChart, bg: "#FBF4E6", ink: "#B98400" },
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
        .lp-spin{ width:15px; height:15px; flex:none; border:2px solid rgba(255,255,255,0.45); border-top-color:#fff; border-radius:50%; display:inline-block; animation:mandaSpin .7s linear infinite; }
        @keyframes mandaSpin{ to{ transform:rotate(360deg); } }
        .lp-btn-white{ font-size:16.5px; color:${color.ink}; background:#fff; padding:16px 30px; border-radius:12px; }
        .lp-btn-white:hover{ background:#EDEDED; }

        .lp-tpl{ display:block; width:100%; text-align:left; padding:0; cursor:pointer; border:1px solid ${color.line}; border-radius:16px; overflow:hidden; background:#fff; font-family:${font.body}; transition:border-color .18s ease, box-shadow .2s ease, transform .2s ease; }
        .lp-tpl:hover{ border-color:var(--tpl,${color.accent}); box-shadow:0 22px 46px -22px rgba(20,20,30,0.28); transform:translateY(-4px); }
        .lp-tpl:focus-visible{ outline:2px solid ${color.accent}; outline-offset:2px; }
        .lp-tpl-top{ height:162px; padding:22px 22px 0; overflow:hidden; display:flex; align-items:flex-end; }
        .lp-tpl-paper{ width:100%; background:#fff; border-radius:12px 12px 0 0; box-shadow:0 14px 30px -16px rgba(20,20,30,0.3); overflow:hidden; transition:transform .28s ease, box-shadow .28s ease; }
        .lp-tpl:hover .lp-tpl-paper{ transform:translateY(-5px); box-shadow:0 24px 44px -18px rgba(20,20,30,0.36); }
        .lp-tpl-accent{ height:4px; }
        .lp-tpl-paper-in{ padding:15px 16px 18px; }
        .lp-tpl-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:15px; }
        .lp-tpl-mono{ width:24px; height:24px; border-radius:7px; background:${color.ink}; color:#fff; display:flex; align-items:center; justify-content:center; font-family:${font.heading}; font-weight:900; font-size:12px; }
        .lp-tpl-chip{ width:27px; height:27px; border-radius:8px; display:flex; align-items:center; justify-content:center; }
        .lp-tpl-l{ height:7px; border-radius:4px; background:${color.gray200}; margin-bottom:8px; }
        .lp-tpl-l.t{ background:#D6D6DC; width:60%; }
        .lp-tpl-l.soft{ height:6px; background:#EEEEEE; }
        .lp-tpl-foot{ padding:15px 18px 18px; border-top:1px solid #F1F1F1; }
        .lp-tpl-tag{ display:inline-flex; align-items:center; gap:7px; font-size:11px; font-weight:600; letter-spacing:0.07em; text-transform:uppercase; color:${color.gray400}; }
        .lp-tpl-dot{ width:6px; height:6px; border-radius:50%; }
        .lp-tpl-titrow{ display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:9px; }
        .lp-tpl-title{ font-family:${font.heading}; font-weight:700; font-size:16px; }
        .lp-tpl-arrow{ flex:none; display:flex; opacity:0; transform:translateX(-6px); transition:opacity .2s ease, transform .2s ease; }
        .lp-tpl:hover .lp-tpl-arrow{ opacity:1; transform:none; }

        .lp-audience{ display:grid; grid-template-columns:0.92fr 1.08fr; gap:52px; align-items:start; }
        .lp-aud-p{ font-size:16px; line-height:1.7; color:${color.gray700}; margin:16px 0 0; }
        .lp-aud-grid{ display:grid; grid-template-columns:repeat(2,1fr); gap:14px; }
        .lp-aud-card{ border:1px solid ${color.line}; border-radius:14px; padding:18px; background:#fff; transition:border-color .16s ease, box-shadow .16s ease, transform .16s ease; }
        .lp-aud-card:hover{ border-color:${color.gray200}; box-shadow:0 16px 36px -20px rgba(20,20,30,0.22); transform:translateY(-3px); }
        .lp-aud-ic{ width:40px; height:40px; border-radius:11px; display:flex; align-items:center; justify-content:center; margin-bottom:12px; }
        .lp-aud-name{ font-family:${font.heading}; font-weight:700; font-size:15.5px; letter-spacing:-0.01em; margin-bottom:4px; }
        .lp-aud-desc{ font-size:13px; line-height:1.5; color:${color.gray500}; }
        @media (max-width:860px){ .lp-audience{ grid-template-columns:1fr; gap:34px; } }
        @media (max-width:520px){ .lp-aud-grid{ grid-template-columns:1fr; } }

        /* Vitrine: lista de recursos + prévia real do app */
        .lp-showcase{ display:grid; grid-template-columns:0.8fr 1.2fr; gap:48px; align-items:center; }
        .lp-feat-row{ display:flex; gap:14px; padding:22px 0; border-top:1px solid ${color.ink800}; }
        .lp-feat-row:first-child{ border-top:none; padding-top:0; }
        .lp-feat-ic{ flex:none; width:40px; height:40px; border-radius:11px; background:${color.ink800}; color:${color.accent}; display:flex; align-items:center; justify-content:center; }
        .lp-feat-title{ font-family:${font.heading}; font-weight:700; font-size:17px; letter-spacing:-0.01em; margin-bottom:5px; }
        .lp-feat-body{ font-size:14px; line-height:1.55; color:${color.gray400}; margin:0; }

        .lp-preview{ position:relative; }
        .lp-preview::before{ content:""; position:absolute; inset:-10% -6% -14% -6%; background:radial-gradient(58% 58% at 68% 28%, ${color.accent}40 0%, transparent 70%); filter:blur(22px); z-index:0; pointer-events:none; }
        .lp-browser{ position:relative; z-index:1; background:#fff; border-radius:14px; overflow:hidden; box-shadow:0 44px 90px -34px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.06); }
        .lp-browser-bar{ display:flex; align-items:center; gap:7px; padding:11px 14px; background:${color.surface3}; border-bottom:1px solid ${color.line}; }
        .lp-dot{ width:10px; height:10px; border-radius:50%; background:#E2E2E2; }
        .lp-url{ margin-left:10px; display:inline-flex; align-items:center; gap:6px; font-size:12px; color:${color.gray500}; background:#fff; border:1px solid ${color.gray200}; border-radius:7px; padding:5px 10px; }
        .lp-browser-body{ position:relative; height:404px; overflow:hidden; background:${color.surface2}; padding:22px 22px 0; pointer-events:none; }
        .lp-browser-body::after{ content:""; position:absolute; left:0; right:0; bottom:0; height:96px; background:linear-gradient(180deg, rgba(245,245,247,0) 0%, ${color.surface2} 92%); }
        .lp-feed{ position:absolute; top:36px; right:-20px; z-index:3; width:238px; background:#fff; border:1px solid ${color.line}; border-radius:14px; box-shadow:0 26px 54px -18px rgba(0,0,0,0.55); padding:13px 15px; animation:lpFloat 5s ease-in-out infinite; }
        .lp-feed-h{ font-size:11px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:${color.gray400}; margin-bottom:8px; }
        .lp-feed-row{ display:flex; align-items:center; gap:10px; padding:8px 0; }
        .lp-feed-row + .lp-feed-row{ border-top:1px solid ${color.line2}; }
        .lp-feed-ic{ flex:none; width:30px; height:30px; border-radius:8px; display:flex; align-items:center; justify-content:center; }
        .lp-feed-ic.eye{ background:${color.accentTint}; color:${color.accentInk}; }
        .lp-feed-ic.ok{ background:#EAF5EE; color:#2E7D51; }
        .lp-feed-txt{ font-size:12.5px; color:${color.ink}; line-height:1.3; }
        .lp-feed-txt b{ font-weight:600; }
        .lp-feed-t{ display:block; font-size:11px; color:${color.gray400}; margin-top:1px; }
        @keyframes lpFloat{ 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-8px); } }

        .lp-feat-more{ display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:${color.ink800}; border:1px solid ${color.ink800}; border-radius:14px; overflow:hidden; margin-top:44px; }
        .lp-feat-cell{ background:${color.ink}; padding:26px 24px; }
        .lp-out{ display:grid; grid-template-columns:repeat(3,1fr); gap:22px; }
        .lp-out-card{ border:1px solid ${color.line}; border-radius:18px; padding:28px 26px; background:#fff; transition:border-color .16s ease, box-shadow .16s ease, transform .16s ease; }
        .lp-out-card:hover{ box-shadow:0 18px 40px -20px rgba(20,20,30,0.2); transform:translateY(-3px); }
        .lp-out-icon{ width:46px; height:46px; border-radius:13px; display:flex; align-items:center; justify-content:center; margin-bottom:20px; }
        .lp-out-big{ font-family:${font.heading}; font-weight:800; font-size:26px; line-height:1.08; letter-spacing:-0.02em; margin-bottom:10px; }
        .lp-out-p{ font-size:15px; line-height:1.55; color:${color.gray600}; margin:0 0 20px; }
        .lp-out-tag{ font-size:12px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:${color.gray400}; padding-top:16px; border-top:1px solid ${color.line2}; }
        @media (max-width:820px){ .lp-out{ grid-template-columns:1fr; } }

        /* Palco com gradiente + tela real do app + notificações ao lado */
        .lp-stage{ position:relative; border-radius:26px; padding:clamp(30px,5vw,60px); box-shadow:0 50px 100px -50px rgba(20,20,30,0.55); background:
            radial-gradient(85% 120% at 8% 4%, rgba(217,119,87,0.5) 0%, rgba(217,119,87,0) 52%),
            radial-gradient(75% 115% at 96% 98%, rgba(226,140,90,0.28) 0%, rgba(226,140,90,0) 50%),
            linear-gradient(125deg, #2A1712 0%, #120B08 58%, #0A0A0A 100%); }
        .lp-stage .lp-browser{ max-width:760px; margin:0 auto; }
        .lp-note{ position:absolute; z-index:4; display:flex; align-items:center; gap:11px; width:236px; background:#fff; border:1px solid rgba(20,20,30,0.06); border-radius:14px; box-shadow:0 24px 50px -18px rgba(0,0,0,0.42); padding:13px 15px; }
        .lp-note-ic{ flex:none; width:34px; height:34px; border-radius:9px; display:flex; align-items:center; justify-content:center; }
        .lp-note-ic.eye{ background:${color.accentTint}; color:${color.accentInk}; }
        .lp-note-ic.ok{ background:#EAF5EE; color:#2E7D51; }
        .lp-note-ic.stat{ background:#EEF2FB; color:#3A5BB5; }
        .lp-note-t{ font-size:13px; font-weight:600; color:${color.ink}; line-height:1.25; }
        .lp-note-s{ font-size:12px; color:${color.gray400}; margin-top:1px; }
        .lp-note-1{ left:-14px; top:24%; animation:lpFloat 5s ease-in-out infinite; }
        .lp-note-2{ right:-14px; top:62%; animation:lpFloat 5.6s ease-in-out infinite; }
        .lp-note-3{ left:-14px; top:62%; animation:lpFloat 6.1s ease-in-out infinite; }
        .lp-note-4{ right:-14px; top:22%; animation:lpFloat 5.3s ease-in-out infinite; }

        .lp-cols{ display:grid; grid-template-columns:repeat(3,1fr); gap:40px; margin-top:60px; }
        .lp-col-ic{ width:44px; height:44px; border-radius:12px; background:${color.surface}; border:1px solid ${color.line2}; color:${color.accent}; display:flex; align-items:center; justify-content:center; margin-bottom:16px; }
        .lp-col-title{ font-family:${font.heading}; font-weight:700; font-size:17px; letter-spacing:-0.01em; margin-bottom:8px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .lp-col-body{ font-size:14.5px; line-height:1.55; color:${color.gray600}; margin:0; }
        .lp-col-soon{ font-size:10px; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; color:${color.gray500}; background:${color.surface}; border:1px solid ${color.gray200}; padding:2px 7px; border-radius:999px; }
        @media (max-width:900px){ .lp-cols{ grid-template-columns:repeat(2,1fr); } }
        /* iPad/tablet: notificações visíveis, encostadas nas bordas do card */
        @media (max-width:820px){
          .lp-note{ width:194px; padding:11px 13px; }
          .lp-note-1, .lp-note-3{ left:2px; }
          .lp-note-2, .lp-note-4{ right:2px; }
        }
        @media (max-width:600px){ .lp-cols{ grid-template-columns:1fr; gap:30px; } }
        /* celular: notificações flutuam nas faixas escuras acima e abaixo do card,
           sem cobrir o conteúdo da proposta. */
        @media (max-width:560px){
          .lp-stage{ padding:64px 16px; }
          .lp-note{ width:172px; padding:10px 12px; gap:10px; box-shadow:0 16px 34px -14px rgba(0,0,0,0.5); }
          .lp-note-ic{ width:30px; height:30px; }
          .lp-note-t{ font-size:12px; }
          .lp-note-s{ font-size:10.5px; }
          .lp-note-3, .lp-note-4{ display:none; }
          .lp-note-1{ left:6px; top:12px; }
          .lp-note-2{ right:6px; top:auto; bottom:12px; }
        }
        @media (prefers-reduced-motion: reduce){ .lp-note{ animation:none; } }
        @media (max-width:900px){ .lp-showcase{ grid-template-columns:1fr; gap:40px; } .lp-feed{ right:4px; } }
        @media (max-width:820px){ .lp-feat-more{ grid-template-columns:1fr; } }
        @media (prefers-reduced-motion: reduce){ .lp-feed{ animation:none; } }

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
            <p style={{ fontSize: "18.5px", lineHeight: 1.55, color: color.gray600, maxWidth: 440, margin: "0 0 32px" }}>
              O Manda é a ferramenta para freelancers e pequenos negócios criarem propostas comerciais e orçamentos profissionais. Monte em minutos, envie por link e veja na hora quando o cliente abre e aceita.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={start} className="lp-btn lp-btn-dark">Começar agora</button>
              <button onClick={seeHow} className="lp-btn lp-btn-ghost">
                Ver como funciona <ArrowRight className="lp-arrow" size={16} strokeWidth={2.2} />
              </button>
            </div>
            <p style={{ fontSize: "13.5px", color: color.gray400, margin: "20px 0 0" }}>Planos a partir de R$12/mês. Você começa em menos de um minuto.</p>
          </div>

          <div style={{ animation: "mandaFadeUp .7s .1s ease both" }}>
            <div style={{ background: color.white, border: `1px solid ${color.line}`, borderRadius: 16, boxShadow: "0 24px 60px -20px rgba(20,20,30,0.22),0 8px 20px -12px rgba(20,20,30,0.12)", overflow: "hidden", animation: "mandaFloat 6s ease-in-out infinite" }}>
              <div style={{ height: 40, background: color.surface3, borderBottom: "1px solid #EEE", display: "flex", alignItems: "center", padding: "0 14px", gap: 7 }}>
                <Dot c="#F4B4A5" /><Dot c="#F6D9A8" /><Dot c="#C8E6C0" />
                <span style={{ marginLeft: 12, fontSize: 12, color: color.gray400, fontWeight: 500 }}>mandaproposta.com/p/proposta-viana</span>
              </div>
              <div style={{ padding: "26px 28px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                  <div>
                    <div style={{ width: 38, height: 38, borderRadius: 9, background: color.ink, color: color.white, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.heading, fontWeight: 900, marginBottom: 12 }}>R</div>
                    <div style={{ fontSize: 12, color: color.gray400, fontWeight: 500 }}>Proposta para</div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>Viana Café · Vídeo institucional</div>
                  </div>
                  {demoStatus === "accepted" ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "11.5px", fontWeight: 600, color: "#2E7D51", background: "#EAF5EE", border: "1px solid #C9E7D5", padding: "5px 10px", borderRadius: 999 }}>
                      <BadgeCheck size={13} strokeWidth={2.4} />Aceita
                    </span>
                  ) : (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "11.5px", fontWeight: 600, color: color.accentInk, background: color.accentTint, border: `1px solid ${color.accentLine}`, padding: "5px 10px", borderRadius: 999 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color.accent, animation: "mandaPulse 1.8s ease-in-out infinite" }} />Visualizada
                    </span>
                  )}
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
                {demoStatus === "accepted" ? (
                  <button disabled style={{ width: "100%", fontFamily: font.body, fontSize: 15, fontWeight: 600, color: color.white, background: "#2E7D51", border: "none", padding: 13, borderRadius: 10, cursor: "default", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, animation: "mandaFadeUp .3s ease both" }}>
                    <BadgeCheck size={17} strokeWidth={2.4} />Proposta aceita
                  </button>
                ) : (
                  <button onClick={acceptDemo} disabled={demoStatus === "loading"} style={{ width: "100%", fontFamily: font.body, fontSize: 15, fontWeight: 600, color: color.white, background: color.accent, border: "none", padding: 13, borderRadius: 10, cursor: demoStatus === "loading" ? "wait" : "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: demoStatus === "loading" ? 0.92 : 1 }}>
                    {demoStatus === "loading" ? <><span className="lp-spin" />Aceitando…</> : "Aceitar proposta"}
                  </button>
                )}
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
              <button key={i} data-reveal data-reveal-delay={i} onClick={start} className="lp-tpl" style={{ ["--tpl"]: t.ink }}>
                <div className="lp-tpl-top" style={{ background: t.bg }}>
                  <div className="lp-tpl-paper">
                    <div className="lp-tpl-accent" style={{ background: t.ink }} />
                    <div className="lp-tpl-paper-in">
                      <div className="lp-tpl-head">
                        <span className="lp-tpl-mono"><img src="/logo-mark-white.svg" alt="" style={{ width: "62%", height: "62%", display: "block" }} /></span>
                        <span className="lp-tpl-chip" style={{ background: t.bg, color: t.ink }}><t.Icon size={14} strokeWidth={2} /></span>
                      </div>
                      <div className="lp-tpl-l t" />
                      <div className="lp-tpl-l soft" style={{ width: "82%" }} />
                      <div className="lp-tpl-l soft" style={{ width: "68%" }} />
                    </div>
                  </div>
                </div>
                <div className="lp-tpl-foot">
                  <span className="lp-tpl-tag"><span className="lp-tpl-dot" style={{ background: t.ink }} />{t.tag}</span>
                  <div className="lp-tpl-titrow">
                    <span className="lp-tpl-title">{t.title}</span>
                    <span className="lp-tpl-arrow" style={{ color: t.ink }}><ArrowRight size={16} strokeWidth={2.2} /></span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="lp-sec" style={{ padding: "92px 24px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div data-reveal style={{ maxWidth: 620, marginBottom: 44 }}>
            <h2 className="lp-h2">Tudo que uma boa proposta precisa</h2>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: color.gray600, margin: "14px 0 0" }}>Nada de recurso de enfeite. Só o que te ajuda a fechar mais rápido.</p>
          </div>

          {/* Palco: a tela real do app (ProposalDesign) num painel com gradiente,
              com as notificações do produto aparecendo ao lado */}
          <div data-reveal className="lp-stage">
            <div className="lp-note lp-note-1">
              <span className="lp-note-ic eye"><Eye size={16} strokeWidth={2} /></span>
              <div>
                <div className="lp-note-t">Maria abriu sua proposta</div>
                <div className="lp-note-s">agora mesmo · pelo celular</div>
              </div>
            </div>
            <div className="lp-note lp-note-2">
              <span className="lp-note-ic ok"><BadgeCheck size={16} strokeWidth={2} /></span>
              <div>
                <div className="lp-note-t">Maria aceitou · R$ 5.800</div>
                <div className="lp-note-s">com data e hora registradas</div>
              </div>
            </div>
            <div className="lp-note lp-note-3">
              <span className="lp-note-ic eye"><Eye size={16} strokeWidth={2} /></span>
              <div>
                <div className="lp-note-t">Gabriel abriu sua proposta</div>
                <div className="lp-note-s">há 1 hora · 2ª vez</div>
              </div>
            </div>
            <div className="lp-note lp-note-4">
              <span className="lp-note-ic stat"><LineChart size={16} strokeWidth={2} /></span>
              <div>
                <div className="lp-note-t">Taxa de aceite: 68%</div>
                <div className="lp-note-s">nos últimos 30 dias</div>
              </div>
            </div>
            <div className="lp-browser">
              <div className="lp-browser-bar">
                <span className="lp-dot" /><span className="lp-dot" /><span className="lp-dot" />
                <span className="lp-url"><LinkIcon size={12} strokeWidth={2} />mandaproposta.com/p/Ab3k9x</span>
              </div>
              <div className="lp-browser-body">
                <ProposalDesign id="minimal" doc={SAMPLE_DOC} accent="#0A0A0A" onAccept={() => {}} />
              </div>
            </div>
          </div>

          <div className="lp-cols">
            {features.map((f, i) => (
              <div key={i} data-reveal data-reveal-delay={i} className="lp-col">
                <div className="lp-col-ic"><f.Icon size={20} strokeWidth={1.9} /></div>
                <div className="lp-col-title">{f.title}{f.soon && <span className="lp-col-soon">Em breve</span>}</div>
                <p className="lp-col-body">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* POR QUE + PRA QUEM (unificado) */}
      <section className="lp-sec" style={{ padding: "88px 24px", background: color.surface2, borderTop: `1px solid ${color.line}` }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div data-reveal style={{ maxWidth: 620, marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: color.accent, marginBottom: 14 }}>Por que o Manda</div>
            <h2 className="lp-h2">Feito pra você parecer agência</h2>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: color.gray600, margin: "14px 0 0" }}>Menos tempo montando, mais respostas e fechamento no preço cheio. É pra isso que o Manda existe.</p>
          </div>
          <div className="lp-cols">
            {outcomes.map((t, i) => (
              <div key={i} data-reveal data-reveal-delay={i} className="lp-col">
                <div className="lp-col-ic"><t.Icon size={20} strokeWidth={1.9} /></div>
                <div className="lp-col-title">{t.title}</div>
                <p className="lp-col-body">{t.quote}</p>
              </div>
            ))}
          </div>

          <div className="lp-audience" style={{ marginTop: 60, paddingTop: 56, borderTop: `1px solid ${color.line}` }}>
            <div data-reveal>
              <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: color.accent, marginBottom: 14 }}>Pra quem é</div>
              <h3 style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 27, lineHeight: 1.1, letterSpacing: "-0.02em", margin: 0 }}>Do vídeo ao código, tem modelo pro seu nicho</h3>
              <p className="lp-aud-p">O Manda é para freelancers e pequenos negócios que vivem de enviar proposta. Se hoje você monta um orçamento no Google Docs, no Word ou no Excel e manda um PDF, o Manda troca isso por uma <strong style={{ color: color.ink, fontWeight: 600 }}>proposta comercial profissional</strong> enviada por link: o cliente abre no celular ou no computador, você vê na hora quando ele abriu, e ele aceita com um clique.</p>
              <p className="lp-aud-p">Redator, consultor, arquiteto, produtor de eventos ou agência: se você vive de mandar orçamento, tem modelo pronto pra você. E todo aceite fica registrado com data e hora.</p>
            </div>
            <div data-reveal className="lp-aud-grid">
              {audiences.map((a, i) => (
                <div key={i} className="lp-aud-card">
                  <div className="lp-aud-ic" style={{ background: a.bg, color: a.ink }}><a.Icon size={20} strokeWidth={1.9} /></div>
                  <div className="lp-aud-name">{a.name}</div>
                  <div className="lp-aud-desc">{a.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 56 }}>
            <button onClick={start} className="lp-btn" style={{ fontFamily: font.body, fontWeight: 600, fontSize: 15, color: color.accent, background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 8px" }}>
              Crie sua conta e mande sua primeira proposta hoje <ArrowRight className="lp-arrow" size={16} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ padding: "20px 24px 96px" }}>
        <div data-reveal style={{ maxWidth: 1120, margin: "0 auto", background: "radial-gradient(110% 130% at 15% 0%,#2A1712 0%,#0A0A0A 60%)", borderRadius: 24, padding: "72px 40px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          <h2 className="lp-cta-h2">Chega de proposta<br />no Google Docs.</h2>
          <p style={{ fontSize: 18, color: color.gray300, maxWidth: 460, margin: "0 auto 32px" }}>Seu próximo cliente merece uma proposta à altura do seu trabalho.</p>
          <button onClick={start} className="lp-btn lp-btn-white">Começar agora</button>
          <p style={{ fontSize: "13.5px", color: color.gray500, margin: "18px 0 0" }}>Planos a partir de R$12/mês. Cancele quando quiser, sem multa.</p>
        </div>
      </section>

      {/* Gatilho discreto do modal de SEO */}
      <div style={{ textAlign: "center", padding: "8px 0 40px" }}>
        <button onClick={() => setShowSeo(true)} aria-label="SEO" style={{ fontSize: 11, letterSpacing: "0.1em", color: color.gray300, background: "none", border: "none", cursor: "pointer", fontFamily: font.body }}>SEO</button>
      </div>

      {showSeo && (
        <div onClick={() => setShowSeo(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(10,10,12,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", width: "100%", maxWidth: 720, maxHeight: "85vh", overflow: "auto", background: "#fff", borderRadius: 18, padding: "30px 32px 34px", boxShadow: "0 40px 90px -30px rgba(0,0,0,0.5)" }}>
            <button onClick={() => setShowSeo(false)} aria-label="Fechar" style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", color: color.gray400, padding: 4 }}><X size={20} strokeWidth={2} /></button>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: color.accent, marginBottom: 8 }}>SEO</div>
            <h3 style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 22, letterSpacing: "-0.01em", margin: "0 0 6px" }}>Termos e nichos que o Manda atende</h3>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: color.gray500, margin: "0 0 20px" }}>Propostas e orçamentos profissionais para freelancers e pequenos negócios no Brasil: de vídeo e design a social media, código e fotografia.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SEO_KEYWORDS.map((k, i) => (
                <span key={i} style={{ fontSize: "12.5px", color: color.gray700, background: color.surface, border: `1px solid ${color.line}`, borderRadius: 999, padding: "5px 11px" }}>{k}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Dot = ({ c }) => <span style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />;
