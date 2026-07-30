import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { font, color } from "../theme.js";
import { api, setToken } from "../lib/api.js";
import CodeInput from "../components/CodeInput.jsx";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const onlyDigits = (v) => v.replace(/\D/g, "").slice(0, 11);
const maskCPF = (v) => {
  const d = onlyDigits(v);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};
function isValidCPF(v) {
  const c = onlyDigits(v);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(c[i], 10) * (10 - i);
  let d1 = (s * 10) % 11; if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(c[9], 10)) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(c[i], 10) * (11 - i);
  let d2 = (s * 10) % 11; if (d2 === 10) d2 = 0;
  return d2 === parseInt(c[10], 10);
}

const COMMON_PASSWORDS = new Set([
  "123456", "1234567", "12345678", "123456789", "1234567890", "12345", "123123",
  "111111", "000000", "654321", "senha", "senha123", "password", "password1",
  "qwerty", "qwerty123", "abc123", "admin", "iloveyou", "1q2w3e4r", "asdfghjkl",
  "112233", "121212", "102030", "mudar123", "aa123456", "gabriel",
]);
const isCommonPassword = (pw) => COMMON_PASSWORDS.has(String(pw).toLowerCase().trim());

// Força da senha de 0 (fraca) a 4 (forte).
function passwordScore(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}

// Tela de login / criar conta. `tab` inicial vem da rota (/entrar ou /criar-conta).
export default function Auth({ go, tab = "signup" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const pendingParams = new URLSearchParams(location.search);
  const pendingPlan = pendingParams.get("plan");
  const pendingInterval = pendingParams.get("interval") === "year" ? "year" : "month";
  const [mode, setMode] = useState(tab);
  const [form, setForm] = useState({ name: "", cpf: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [entering, setEntering] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(false);
  const [googleStep, setGoogleStep] = useState(null); // null | "cpf"
  const [googleCred, setGoogleCred] = useState("");
  const [googleName, setGoogleName] = useState("");
  const [googleCpf, setGoogleCpf] = useState("");
  const [googleBusy, setGoogleBusy] = useState(false);
  const googleBtnRef = useRef(null);
  const googleHandlerRef = useRef();

  // Fluxo "esqueci a senha" (estilo Telegram): email → código. O código correto
  // JÁ LOGA a pessoa; a troca de senha acontece dentro do app, em Configurações.
  const [forgot, setForgot] = useState(null); // null | "email" | "code"
  const [fg, setFg] = useState({ email: "", code: "" });
  const [fgBusy, setFgBusy] = useState(false);
  const [fgErr, setFgErr] = useState("");
  const [fgStatus, setFgStatus] = useState(""); // "" | "error" | "success"
  const fgPatch = (key) => (e) => setFg((s) => ({ ...s, [key]: e.target.value }));

  const openForgot = () => {
    setFg({ email: form.email || "", code: "" });
    setFgErr(""); setFgStatus(""); setForgot("email");
  };
  const sendForgot = async () => {
    setFgErr(""); setFgStatus(""); setFg((s) => ({ ...s, code: "" }));
    if (!/^\S+@\S+\.\S+$/.test(fg.email.trim())) return setFgErr("Digite um email válido.");
    setFgBusy(true);
    try { await api.forgotPassword(fg.email.trim()); setForgot("code"); }
    catch (e) { setFgErr(e.message || "Não foi possível enviar o código."); }
    finally { setFgBusy(false); }
  };
  // Chamado automaticamente quando o 6º dígito entra.
  const submitCode = async (code) => {
    if (fgBusy || fgStatus === "success") return;
    setFgErr(""); setFgBusy(true);
    try {
      const res = await api.resetLogin({ email: fg.email.trim(), code });
      setFgStatus("success");
      setToken(res.token);
      setTimeout(() => { setForgot(null); proceedAfterAuth(); }, 700); // pulinho verde e entra
    } catch (e) {
      setFgStatus("error");
      setFgErr(e.message || "Código incorreto.");
      setTimeout(() => { setFgStatus(""); setFg((s) => ({ ...s, code: "" })); }, 600); // treme e limpa
    } finally { setFgBusy(false); }
  };

  const isLogin = mode === "login";
  const goTo = go || ((d) => navigate(d === "app" ? "/app" : "/"));
  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const updCpf = (e) => setForm((f) => ({ ...f, cpf: maskCPF(e.target.value) }));

  // Animação de entrada. Se veio de um plano (checkout), leva ao Mercado Pago; senão, ao app.
  useEffect(() => {
    if (!entering) return;
    const rm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(async () => {
      if (pendingPlan) {
        try {
          const { url } = await api.checkout(pendingPlan, pendingInterval);
          window.location.href = url; // vai pro gateway do Mercado Pago
          return;
        } catch { /* se o checkout falhar, segue pro app */ }
      }
      try { sessionStorage.setItem("manda_entering", "1"); } catch { /* ignore */ }
      goTo("app");
    }, rm ? 350 : 1700);
    return () => clearTimeout(t);
  }, [entering]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    if (!isLogin) {
      if (!form.name.trim()) return setErr("Digite seu nome.");
      if (!isValidCPF(form.cpf)) return setErr("CPF inválido. Confira os números.");
      if (isCommonPassword(form.password)) return setErr("Essa senha é muito comum e fácil de adivinhar. Escolha outra.");
      if (passwordScore(form.password) < 2) return setErr("Senha fraca. Use ao menos 8 caracteres, misturando letras e números.");
      if (!agree) return setErr("Você precisa aceitar os Termos e a Política de Privacidade.");
    }
    setBusy(true);
    try {
      const res = isLogin
        ? await api.login({ email: form.email, password: form.password })
        : await api.register({ name: form.name, email: form.email, cpf: onlyDigits(form.cpf), password: form.password });
      setToken(res.token);

      // Veio de um plano? Tenta abrir o checkout do Mercado Pago. Se falhar, a
      // conta já existe e a pessoa já está logada: em vez de travar no cadastro,
      // entra no app (estado "sem plano"), onde dá pra assinar de novo em Preços.
      if (pendingPlan) {
        try {
          const { url } = await api.checkout(pendingPlan, pendingInterval);
          if (url) { window.location.href = url; return; }
        } catch (e) {
          console.error("[checkout]", e.message);
        }
      }

      setEntering(true);
    } catch (err) {
      setErr(err.message || "Não foi possível continuar. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  // Depois de autenticar: se veio de um plano, vai ao checkout; senão, entra no app.
  async function proceedAfterAuth() {
    if (pendingPlan) {
      try {
        const { url } = await api.checkout(pendingPlan, pendingInterval);
        if (url) { window.location.href = url; return; }
      } catch { /* segue pro app */ }
    }
    setEntering(true);
  }

  async function handleGoogle(credential) {
    setErr("");
    try {
      const res = await api.googleAuth({ credential });
      if (res.needsCpf) {
        setGoogleCred(credential);
        setGoogleName(res.name || "");
        setGoogleStep("cpf");
        return;
      }
      setToken(res.token);
      await proceedAfterAuth();
    } catch (e) {
      setErr(e.message || "Não foi possível entrar com o Google.");
    }
  }

  async function submitGoogleCpf() {
    setErr("");
    if (!isValidCPF(googleCpf)) return setErr("CPF inválido. Confira os números.");
    if (!agree) return setErr("Você precisa aceitar os Termos e a Política de Privacidade.");
    setGoogleBusy(true);
    try {
      const res = await api.googleAuth({ credential: googleCred, cpf: onlyDigits(googleCpf) });
      setToken(res.token);
      setGoogleStep(null);
      await proceedAfterAuth();
    } catch (e) {
      setErr(e.message || "Não foi possível criar sua conta.");
    } finally {
      setGoogleBusy(false);
    }
  }

  // Mantém o callback do Google sempre com a versão mais recente do handler.
  googleHandlerRef.current = handleGoogle;

  // Carrega o Google Identity Services e desenha o botão oficial.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    const draw = () => {
      if (cancelled || !window.google?.accounts?.id || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (resp) => googleHandlerRef.current && googleHandlerRef.current(resp.credential),
      });
      googleBtnRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline", size: "large", width: 400, text: isLogin ? "signin_with" : "signup_with", locale: "pt-BR",
      });
    };
    if (window.google?.accounts?.id) { draw(); return () => { cancelled = true; }; }
    let s = document.getElementById("gis-script");
    if (!s) {
      s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true; s.defer = true; s.id = "gis-script";
      document.head.appendChild(s);
    }
    s.addEventListener("load", draw);
    return () => { cancelled = true; s && s.removeEventListener("load", draw); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLogin]);

  const tabBase = { flex: 1, fontFamily: font.body, fontSize: "14.5px", fontWeight: 600, padding: 9, borderRadius: 8, border: "none", cursor: "pointer", transition: "all .15s" };
  const active = { ...tabBase, background: color.white, color: color.ink, boxShadow: "0 1px 2px rgba(0,0,0,0.08)" };
  const idle = { ...tabBase, background: "transparent", color: color.gray500 };
  const labelStyle = { fontSize: "13.5px", fontWeight: 600, color: color.gray700 };

  const Logo = ({ onDark }) => (
    <img src={onDark ? "/logo-horizontal-white.svg" : "/logo-horizontal.svg"} alt="Manda" style={{ height: 30, width: "auto", display: "block" }} />
  );

  const cpfValid = isValidCPF(form.cpf);
  const firstName = form.name.trim().split(" ")[0];

  const pwCommon = !isLogin && !!form.password && isCommonPassword(form.password);
  const pwScore = passwordScore(form.password);
  const pwFilled = pwCommon ? 1 : pwScore;
  const pwMeta = pwCommon ? { c: "#B4443C", t: "Muito comum, escolha outra" }
    : pwScore <= 1 ? { c: "#B4443C", t: "Fraca" }
    : pwScore === 2 ? { c: "#D97757", t: "Média" }
    : pwScore === 3 ? { c: "#2E7D51", t: "Boa" }
    : { c: "#2E7D51", t: "Forte" };

  return (
    <div className="au-grid" style={{ fontFamily: font.body, color: color.ink }}>
      <style>{`
        .au-grid{ display:grid; grid-template-columns:1.05fr 1fr; min-height:100vh; }
        .au-aside{ position:relative; overflow:hidden; background:radial-gradient(120% 100% at 20% 10%,#2A1712 0%,#0A0A0A 62%); color:#fff; padding:44px 48px; display:flex; flex-direction:column; justify-content:space-between; }
        .au-aside > *{ position:relative; z-index:1; }
        .au-aside::before, .au-aside::after{ content:""; position:absolute; border-radius:50%; filter:blur(64px); z-index:0; pointer-events:none; }
        .au-aside::before{ width:440px; height:440px; top:-130px; left:-110px; background:radial-gradient(circle, rgba(217,119,87,0.38) 0%, rgba(217,119,87,0) 70%); animation:auBlobA 19s ease-in-out infinite; }
        .au-aside::after{ width:380px; height:380px; bottom:-120px; right:-90px; background:radial-gradient(circle, rgba(233,150,123,0.24) 0%, rgba(233,150,123,0) 70%); animation:auBlobB 23s ease-in-out infinite; }
        @keyframes auBlobA{ 0%,100%{ transform:translate(0,0) scale(1); } 50%{ transform:translate(46px,34px) scale(1.14); } }
        @keyframes auBlobB{ 0%,100%{ transform:translate(0,0) scale(1); } 50%{ transform:translate(-34px,-26px) scale(1.1); } }

        /* Painel esquerdo: blocos de texto com divisórias finas */
        .au-steps{ margin-top:42px; max-width:360px; }
        .au-step{ padding:18px 0; border-top:1px solid rgba(255,255,255,0.1); }
        .au-step:last-child{ border-bottom:1px solid rgba(255,255,255,0.1); }
        .au-step-t{ font-family:${font.heading}; font-weight:700; font-size:15.5px; letter-spacing:-0.01em; color:#fff; margin-bottom:3px; }
        .au-step-d{ font-size:13.5px; line-height:1.5; color:${color.gray400}; }
        .au-form-wrap{ display:flex; align-items:center; justify-content:center; padding:48px 40px; background:#fff; }
        .au-mobilelogo{ display:none; margin-bottom:22px; }

        /* Banner-hero do mobile: fundo escuro no topo; o card de login sobe por cima. */
        .au-mobanner{ display:none; position:relative; overflow:hidden; background:radial-gradient(120% 130% at 12% 0%,#2A1712 0%,#0A0A0A 72%); color:#fff; padding:34px 24px 52px; }
        .au-mobanner-h{ font-family:${font.heading}; font-weight:900; font-size:24px; line-height:1.1; letter-spacing:-0.02em; margin-bottom:6px; }
        .au-mobanner-h span{ color:${color.accent}; }
        .au-mobanner-p{ font-size:13.5px; line-height:1.5; color:${color.gray300}; margin:0 0 14px; }
        .au-mobanner-chips{ display:flex; gap:8px; flex-wrap:wrap; }
        .au-mobanner-chips span{ display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:600; color:rgba(255,255,255,0.9); background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.12); border-radius:999px; padding:6px 12px; }
        .au-mobanner-chips span::before{ content:""; width:5px; height:5px; border-radius:50%; background:${color.accent}; flex:none; }

        .au-input{ font-family:${font.body}; font-size:15px; padding:12px 14px; border:1px solid ${color.gray200}; border-radius:10px; outline:none; background:#fff; width:100%; transition:border-color .15s ease, box-shadow .15s ease; }
        .au-input:focus{ border-color:${color.accent}; box-shadow:0 0 0 3px rgba(217,119,87,0.15); }
        .au-input::placeholder{ color:${color.gray400}; }

        .au-btn{ font-family:${font.body}; font-weight:600; border:none; cursor:pointer; border-radius:10px; transition:background .16s ease, border-color .16s ease, box-shadow .16s ease, opacity .15s ease; }
        .au-btn:active{ transform:translateY(1px); }
        .au-btn:focus-visible{ outline:2px solid ${color.accent}; outline-offset:2px; }
        .au-submit{ width:100%; font-size:15.5px; color:#fff; background:${color.ink}; padding:14px; margin-top:4px; }
        .au-submit:hover:not(:disabled){ background:#262626; }
        .au-submit:disabled{ opacity:.7; cursor:wait; }
        .au-google{ width:100%; font-size:15px; color:${color.ink900}; background:#fff; border:1px solid ${color.gray200}; padding:13px; display:flex; align-items:center; justify-content:center; gap:10px; border-radius:10px; transition:border-color .16s ease, background .16s ease; }
        .au-google:hover{ border-color:${color.ink}; background:${color.surface3}; }
        /* Botão do Google com o NOSSO design: o oficial fica transparente por cima */
        .au-gwrap{ position:relative; width:100%; }
        .au-gwrap .au-google{ pointer-events:none; }
        .au-gwrap:hover .au-google{ border-color:${color.ink}; background:${color.surface3}; }
        .au-greal{ position:absolute; inset:0; z-index:1; opacity:0.001; overflow:hidden; display:flex; align-items:center; justify-content:center; }
        .au-greal > div{ width:100%; }

        .au-tab:focus-visible{ outline:2px solid ${color.accent}; outline-offset:2px; }
        .au-link{ background:none; border:none; padding:0; cursor:pointer; font-family:${font.body}; font-weight:600; color:${color.accent}; }
        .au-link:hover{ text-decoration:underline; }
        .au-link:focus-visible{ outline:2px solid ${color.accent}; outline-offset:2px; border-radius:4px; }
        .au-linksm{ font-weight:500; font-size:13px; }

        .au-enter{ position:fixed; inset:0; z-index:200; background:radial-gradient(120% 100% at 30% 10%,#2A1712 0%,#0A0A0A 62%); color:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; animation:auFade .3s ease both; }
        .au-enter-mark{ width:64px; height:64px; border-radius:16px; background:#fff; color:#0A0A0A; display:flex; align-items:center; justify-content:center; font-family:${font.heading}; font-weight:900; font-size:34px; margin-bottom:6px; animation:auMark .6s cubic-bezier(.2,.8,.2,1) both; }
        .au-enter-title{ font-family:${font.heading}; font-weight:900; font-size:24px; letter-spacing:-0.02em; animation:auUp .5s .15s ease both; }
        .au-enter-sub{ font-size:14px; color:#D4D4D8; animation:auUp .5s .25s ease both; }
        .au-enter-bar{ width:180px; height:4px; border-radius:999px; background:rgba(255,255,255,0.15); overflow:hidden; margin-top:10px; }
        .au-enter-bar span{ display:block; height:100%; width:38%; background:${color.accent}; border-radius:999px; animation:auBar 1.5s ease both; }
        @keyframes auFade{ from{ opacity:0; } to{ opacity:1; } }
        @keyframes auMark{ 0%{ opacity:0; transform:scale(.6) rotate(-8deg); } 100%{ opacity:1; transform:none; } }
        @keyframes auUp{ from{ opacity:0; transform:translateY(8px); } to{ opacity:1; transform:none; } }
        @keyframes auBar{ from{ transform:translateX(-120%); } to{ transform:translateX(320%); } }

        @media (max-width:860px){
          .au-grid{ display:flex; flex-direction:column; min-height:100vh; }
          .au-aside{ display:none; }
          .au-mobilelogo{ display:none; }
          .au-mobanner{ display:block; }
          /* Card branco sobe por cima do banner com o topo arredondado. */
          .au-form-wrap{ flex:1; padding:30px 24px 40px; align-items:flex-start; border-radius:24px 24px 0 0; margin-top:-24px; position:relative; z-index:1; }
        }
        @media (prefers-reduced-motion: reduce){
          .au-grid *, .au-grid *::before, .au-grid *::after, .au-enter *{ animation-duration:.001ms !important; transition-duration:.001ms !important; }
        }
      `}</style>

      {/* Banner-hero do mobile (fundo). No desktop some; o card de login sobe por cima com bordas arredondadas. */}
      <div className="au-mobanner">
        <button onClick={() => goTo("landing")} className="au-btn" style={{ background: "none", padding: 0, borderRadius: 6, marginBottom: 18 }} aria-label="Voltar para a página inicial">
          <Logo onDark />
        </button>
        <div className="au-mobanner-h">
          {isLogin ? <>Bora fechar <span>mais um?</span></> : <>Proposta com cara de <span>agência.</span></>}
        </div>
        <div className="au-mobanner-p">
          {isLogin ? "Monte sua próxima proposta em minutos e envie por link." : "Do primeiro rascunho ao sim do cliente, num lugar só."}
        </div>
        <div className="au-mobanner-chips"><span>Crie em minutos</span><span>Envie por link</span><span>Feche com 1 clique</span></div>
      </div>

      {/* Painel esquerdo (marketing) */}
      <aside className="au-aside">
        <button onClick={() => goTo("landing")} className="au-btn" style={{ background: "none", padding: 0, width: "fit-content", borderRadius: 6 }} aria-label="Voltar para a página inicial">
          <Logo onDark />
        </button>
        <div style={{ maxWidth: 400 }}>
          <h2 style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 42, lineHeight: 1.04, letterSpacing: "-0.03em", margin: "0 0 16px" }}>
            {isLogin ? <>Bora fechar<br />mais um? <span style={{ color: color.accent }}>→</span></> : <>Sua proposta,<br />com cara de <span style={{ color: color.accent }}>agência.</span></>}
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.55, color: color.gray300, margin: 0 }}>
            {isLogin
              ? "Entre e monte sua próxima proposta em minutos. Seu cliente merece ver seu trabalho num formato à altura."
              : "Do primeiro rascunho ao sim do cliente, tudo num lugar só."}
          </p>

          <div className="au-steps">
            <div className="au-step">
              <div className="au-step-t">Crie em minutos</div>
              <div className="au-step-d">Modelos prontos por nicho, com cara de agência. Sem brigar com o Docs.</div>
            </div>
            <div className="au-step">
              <div className="au-step-t">Envie por link</div>
              <div className="au-step-d">O cliente abre no celular ou no computador. Você sabe na hora que ele abriu.</div>
            </div>
            <div className="au-step">
              <div className="au-step-t">Feche com um clique</div>
              <div className="au-step-d">Aceite registrado com data e hora. Sem burocracia, sem contrato à parte.</div>
            </div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: color.gray500 }}>Feito no Brasil 🇧🇷 para freelancers</div>
      </aside>

      {/* Formulário */}
      <div className="au-form-wrap">
        <div style={{ width: "100%", maxWidth: 392 }}>
          <button onClick={() => goTo("landing")} className="au-btn au-mobilelogo" style={{ background: "none", padding: 0, borderRadius: 6 }} aria-label="Voltar para a página inicial">
            <Logo />
          </button>

          <div style={{ display: "flex", gap: 4, background: color.surface, borderRadius: 11, padding: 4, marginBottom: 32 }}>
            <button onClick={() => setMode("login")} className="au-tab" style={isLogin ? active : idle}>Entrar</button>
            <button onClick={() => setMode("signup")} className="au-tab" style={isLogin ? idle : active}>Criar conta</button>
          </div>

          <h1 style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 28, letterSpacing: "-0.02em", margin: "0 0 6px" }}>
            {isLogin ? "Que bom te ver de novo" : "Crie sua conta"}
          </h1>
          <p style={{ fontSize: 15, color: color.gray500, margin: "0 0 28px" }}>
            {isLogin ? "Entre para acompanhar suas propostas." : "Leva menos de um minuto pra começar."}
          </p>

          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {!isLogin && (
              <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <span style={labelStyle}>Nome</span>
                <input className="au-input" type="text" value={form.name} onChange={upd("name")} placeholder="Como o cliente te chama" autoComplete="name" required />
              </label>
            )}
            {!isLogin && (
              <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <span style={labelStyle}>CPF</span>
                <input className="au-input" type="text" inputMode="numeric" value={form.cpf} onChange={updCpf} placeholder="000.000.000-00" autoComplete="off" required
                  style={form.cpf && !cpfValid ? { borderColor: "#E7A79F" } : undefined} />
                {form.cpf.length >= 14 && !cpfValid && <span style={{ fontSize: 12.5, color: "#B4443C" }}>CPF inválido.</span>}
                <span style={{ fontSize: 12, color: color.gray400 }}>Uma conta por CPF.</span>
              </label>
            )}
            <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <span style={labelStyle}>Email</span>
              <input className="au-input" type="email" value={form.email} onChange={upd("email")} placeholder="voce@email.com" autoComplete="email" required />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={labelStyle}>Senha</span>
                {isLogin && <button type="button" onClick={openForgot} className="au-link au-linksm">Esqueci a senha</button>}
              </div>
              <div style={{ position: "relative" }}>
                <input className="au-input" type={showPw ? "text" : "password"} value={form.password} onChange={upd("password")} placeholder="••••••••" autoComplete={isLogin ? "current-password" : "new-password"} required style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="au-btn" aria-label={showPw ? "Ocultar senha" : "Mostrar senha"} aria-pressed={showPw} style={{ position: "absolute", top: 0, right: 0, height: "100%", width: 42, background: "none", color: color.gray400, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10 }}>
                  {showPw ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                </button>
              </div>
              {!isLogin && form.password && (
                <div>
                  <div style={{ display: "flex", gap: 4, marginTop: 8, marginBottom: 5 }}>
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: pwFilled > i ? pwMeta.c : color.gray200, transition: "background .2s ease" }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: pwMeta.c }}>{pwMeta.t}</span>
                </div>
              )}
            </label>

            {!isLogin && (
              <label style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13, color: color.gray600, cursor: "pointer", lineHeight: 1.45 }}>
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, flex: "none", accentColor: color.accent, cursor: "pointer" }} />
                <span>Li e aceito os <a href="/termos" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: color.accent, fontWeight: 600 }}>Termos de Uso</a> e a <a href="/privacidade" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: color.accent, fontWeight: 600 }}>Política de Privacidade</a>.</span>
              </label>
            )}

            {err && <div role="alert" style={{ fontSize: 13.5, color: "#B4443C", background: "#FDECEA", border: "1px solid #F5D2CD", padding: "10px 12px", borderRadius: 9 }}>{err}</div>}

            <button type="submit" disabled={busy} className="au-btn au-submit">
              {busy ? "Só um instante…" : isLogin ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "22px 0" }}>
            <span style={{ flex: 1, height: 1, background: color.line }} />
            <span style={{ fontSize: 13, color: color.gray400 }}>ou</span>
            <span style={{ flex: 1, height: 1, background: color.line }} />
          </div>

          {GOOGLE_CLIENT_ID ? (
            <div className="au-gwrap">
              {/* Visual nosso; o botão real do Google fica invisível por cima e captura o clique */}
              <span className="au-btn au-google" aria-hidden="true">
                <GoogleIcon />{isLogin ? "Entrar com Google" : "Cadastrar com Google"}
              </span>
              <div ref={googleBtnRef} className="au-greal" aria-label={isLogin ? "Entrar com Google" : "Cadastrar com Google"} />
            </div>
          ) : (
            <button onClick={() => setErr("Login com Google ainda não configurado. Falta definir VITE_GOOGLE_CLIENT_ID.")} className="au-btn au-google">
              <GoogleIcon />{isLogin ? "Entrar com Google" : "Cadastrar com Google"}
            </button>
          )}

          <p style={{ textAlign: "center", fontSize: 14, color: color.gray500, margin: "26px 0 0" }}>
            {isLogin ? "Ainda não tem conta? " : "Já tem conta? "}
            <button type="button" onClick={() => setMode(isLogin ? "signup" : "login")} className="au-link">
              {isLogin ? "Criar agora" : "Entrar"}
            </button>
          </p>
        </div>
      </div>

      {/* Animação de entrada */}
      {entering && (
        <div className="au-enter">
          <div className="au-enter-mark"><img src="/logo-mark.svg" alt="Manda" style={{ width: "58%", height: "58%", display: "block" }} /></div>
          <div className="au-enter-title">{isLogin ? "Bora fechar mais um" : `Boas-vindas${firstName ? ", " + firstName : ""}`}</div>
          <div className="au-enter-sub">Preparando seu espaço…</div>
          <div className="au-enter-bar"><span /></div>
        </div>
      )}

      {/* Etapa extra: CPF no primeiro login pelo Google */}
      {googleStep === "cpf" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(10,10,12,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ width: "100%", maxWidth: 400, background: "#fff", borderRadius: 16, padding: "28px 26px", boxShadow: "0 40px 90px -30px rgba(0,0,0,0.5)" }}>
            <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 20, letterSpacing: "-0.01em", marginBottom: 4 }}>Quase lá{googleName ? `, ${googleName.split(" ")[0]}` : ""}!</div>
            <p style={{ fontSize: 14, lineHeight: 1.5, color: color.gray500, margin: "0 0 18px" }}>Falta só o seu CPF pra criar sua conta. Uma conta por CPF.</p>
            <input className="au-input" type="text" inputMode="numeric" value={googleCpf} onChange={(e) => setGoogleCpf(maskCPF(e.target.value))} placeholder="000.000.000-00" autoComplete="off" />
            <label style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13, color: color.gray600, cursor: "pointer", lineHeight: 1.45, margin: "14px 0 0" }}>
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, flex: "none", accentColor: color.accent, cursor: "pointer" }} />
              <span>Li e aceito os <a href="/termos" target="_blank" rel="noopener noreferrer" style={{ color: color.accent, fontWeight: 600 }}>Termos de Uso</a> e a <a href="/privacidade" target="_blank" rel="noopener noreferrer" style={{ color: color.accent, fontWeight: 600 }}>Política de Privacidade</a>.</span>
            </label>
            {err && <div role="alert" style={{ fontSize: 13.5, color: "#B4443C", background: "#FDECEA", border: "1px solid #F5D2CD", padding: "10px 12px", borderRadius: 9, margin: "14px 0 0" }}>{err}</div>}
            <button onClick={submitGoogleCpf} disabled={googleBusy} className="au-btn au-submit" style={{ marginTop: 16 }}>{googleBusy ? "Criando…" : "Criar conta"}</button>
            <button type="button" onClick={() => { setGoogleStep(null); setGoogleCred(""); setErr(""); }} className="au-link" style={{ display: "block", margin: "12px auto 0" }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Esqueci a senha (estilo Telegram): o código certo já loga */}
      {forgot && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(10,10,12,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ width: "100%", maxWidth: 400, background: "#fff", borderRadius: 16, padding: "28px 26px", boxShadow: "0 40px 90px -30px rgba(0,0,0,0.5)" }}>
            <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 20, letterSpacing: "-0.01em", marginBottom: 4 }}>
              {forgot === "email" ? "Esqueceu a senha?" : fgStatus === "success" ? "Tudo certo!" : "Confira seu email"}
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.5, color: color.gray500, margin: "0 0 18px" }}>
              {forgot === "email"
                ? "Digite seu email e enviaremos um código de 6 dígitos. Com ele você entra direto e troca a senha em Configurações."
                : fgStatus === "success"
                  ? "Código confirmado. Entrando…"
                  : `Enviamos um código para ${fg.email}. Digite abaixo para entrar. Ele expira em 10 minutos.`}
            </p>

            {forgot === "email" ? (
              <>
                <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <span style={labelStyle}>Email</span>
                  <input className="au-input" type="email" value={fg.email} onChange={fgPatch("email")} onKeyDown={(e) => { if (e.key === "Enter") sendForgot(); }} placeholder="voce@email.com" autoComplete="email" autoFocus />
                </label>
                {fgErr && <div role="alert" style={{ fontSize: 13.5, color: "#B4443C", background: "#FDECEA", border: "1px solid #F5D2CD", padding: "10px 12px", borderRadius: 9, margin: "14px 0 0" }}>{fgErr}</div>}
                <button onClick={sendForgot} disabled={fgBusy} className="au-btn au-submit" style={{ marginTop: 16 }}>
                  {fgBusy ? "Enviando…" : "Enviar código"}
                </button>
              </>
            ) : (
              <>
                <CodeInput
                  value={fg.code}
                  onChange={(v) => { setFg((s) => ({ ...s, code: v })); if (fgErr) setFgErr(""); }}
                  onComplete={submitCode}
                  status={fgStatus}
                  disabled={fgBusy || fgStatus === "success"}
                  autoFocus
                />
                {fgErr && fgStatus !== "success" && (
                  <div role="alert" style={{ fontSize: 13.5, color: "#B4443C", textAlign: "center", margin: "12px 0 0" }}>{fgErr}</div>
                )}
                {fgStatus !== "success" && (
                  <button type="button" onClick={sendForgot} disabled={fgBusy} className="au-link au-linksm" style={{ display: "block", margin: "16px auto 0" }}>Reenviar código</button>
                )}
              </>
            )}

            {fgStatus !== "success" && (
              <button type="button" onClick={() => { setForgot(null); setFgErr(""); setFgStatus(""); }} className="au-link" style={{ display: "block", margin: "12px auto 0" }}>Cancelar</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.5 12.2c0-.7-.06-1.4-.18-2.05H12v3.88h5.9a5.05 5.05 0 0 1-2.19 3.31v2.75h3.54c2.07-1.9 3.25-4.71 3.25-7.89Z" />
      <path fill="#34A853" d="M12 23c2.94 0 5.42-.97 7.22-2.63l-3.54-2.75c-.98.66-2.23 1.05-3.68 1.05-2.83 0-5.23-1.91-6.08-4.48H2.27v2.84A10.99 10.99 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.92 14.19a6.6 6.6 0 0 1 0-4.38V6.97H2.27a11 11 0 0 0 0 10.06l3.65-2.84Z" />
      <path fill="#EA4335" d="M12 4.75c1.6 0 3.03.55 4.16 1.62l3.12-3.12A10.98 10.98 0 0 0 12 .5 10.99 10.99 0 0 0 2.27 6.97l3.65 2.84C6.77 6.66 9.17 4.75 12 4.75Z" />
    </svg>
  );
}
