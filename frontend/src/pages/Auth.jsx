import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { font, color } from "../theme.js";
import { signInWithPassword, signUp } from "../lib/supabase.js";

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

// Tela de login / criar conta. `tab` inicial vem da rota (/entrar ou /criar-conta).
export default function Auth({ go, tab = "signup" }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(tab);
  const [form, setForm] = useState({ name: "", cpf: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [entering, setEntering] = useState(false);

  const isLogin = mode === "login";
  const goTo = go || ((d) => navigate(d === "app" ? "/app" : "/"));
  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const updCpf = (e) => setForm((f) => ({ ...f, cpf: maskCPF(e.target.value) }));

  // Animação de entrada: quando o acesso dá certo, mostra o overlay e só então entra no app.
  useEffect(() => {
    if (!entering) return;
    const rm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => { try { sessionStorage.setItem("manda_entering", "1"); } catch { /* ignore */ } goTo("app"); }, rm ? 350 : 1700);
    return () => clearTimeout(t);
  }, [entering]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    if (!isLogin) {
      if (!form.name.trim()) return setErr("Digite seu nome.");
      if (!isValidCPF(form.cpf)) return setErr("CPF inválido. Confira os números.");
    }
    setBusy(true);
    const res = isLogin
      ? await signInWithPassword(form.email, form.password)
      : await signUp(form.email, form.password, form.name, onlyDigits(form.cpf));
    setBusy(false);
    if (res.ok) setEntering(true);
    else setErr(res.error?.message || "Não foi possível continuar. Tente de novo.");
  }

  const tabBase = { flex: 1, fontFamily: font.body, fontSize: "14.5px", fontWeight: 600, padding: 9, borderRadius: 8, border: "none", cursor: "pointer", transition: "all .15s" };
  const active = { ...tabBase, background: color.white, color: color.ink, boxShadow: "0 1px 2px rgba(0,0,0,0.08)" };
  const idle = { ...tabBase, background: "transparent", color: color.gray500 };
  const labelStyle = { fontSize: "13.5px", fontWeight: 600, color: color.gray700 };

  const Logo = ({ onDark }) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
      <span style={{ width: 30, height: 30, borderRadius: 8, background: onDark ? color.white : color.ink, color: onDark ? color.ink : color.white, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.heading, fontWeight: 900, fontSize: 18 }}>M</span>
      <span style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 20, color: onDark ? color.white : color.ink }}>Manda</span>
    </span>
  );

  const cpfValid = isValidCPF(form.cpf);
  const firstName = form.name.trim().split(" ")[0];

  return (
    <div className="au-grid" style={{ fontFamily: font.body, color: color.ink }}>
      <style>{`
        .au-grid{ display:grid; grid-template-columns:1.05fr 1fr; min-height:100vh; }
        .au-aside{ position:relative; overflow:hidden; background:radial-gradient(120% 100% at 20% 10%,#2A1712 0%,#0A0A0A 62%); color:#fff; padding:44px 48px; display:flex; flex-direction:column; justify-content:space-between; }
        .au-form-wrap{ display:flex; align-items:center; justify-content:center; padding:48px 40px; background:#fff; }
        .au-mobilelogo{ display:none; margin-bottom:28px; }

        .au-input{ font-family:${font.body}; font-size:15px; padding:12px 14px; border:1px solid ${color.gray200}; border-radius:10px; outline:none; background:#fff; width:100%; transition:border-color .15s ease, box-shadow .15s ease; }
        .au-input:focus{ border-color:${color.accent}; box-shadow:0 0 0 3px rgba(217,119,87,0.15); }
        .au-input::placeholder{ color:${color.gray400}; }

        .au-btn{ font-family:${font.body}; font-weight:600; border:none; cursor:pointer; border-radius:10px; transition:background .16s ease, border-color .16s ease, box-shadow .16s ease, opacity .15s ease; }
        .au-btn:active{ transform:translateY(1px); }
        .au-btn:focus-visible{ outline:2px solid ${color.accent}; outline-offset:2px; }
        .au-submit{ width:100%; font-size:15.5px; color:#fff; background:${color.ink}; padding:14px; margin-top:4px; }
        .au-submit:hover:not(:disabled){ background:#262626; }
        .au-submit:disabled{ opacity:.7; cursor:wait; }
        .au-google{ width:100%; font-size:15px; color:${color.ink900}; background:#fff; border:1px solid ${color.gray200}; padding:13px; display:flex; align-items:center; justify-content:center; gap:10px; }
        .au-google:hover{ border-color:${color.ink}; background:${color.surface3}; }

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
          .au-grid{ grid-template-columns:1fr; }
          .au-aside{ display:none; }
          .au-mobilelogo{ display:flex; }
          .au-form-wrap{ padding:44px 24px; align-items:flex-start; min-height:100vh; }
        }
        @media (prefers-reduced-motion: reduce){
          .au-grid *, .au-grid *::before, .au-grid *::after, .au-enter *{ animation-duration:.001ms !important; transition-duration:.001ms !important; }
        }
      `}</style>

      {/* Painel esquerdo (marketing) */}
      <aside className="au-aside">
        <button onClick={() => goTo("landing")} className="au-btn" style={{ background: "none", padding: 0, width: "fit-content", borderRadius: 6 }} aria-label="Voltar para a página inicial">
          <Logo onDark />
        </button>
        <div style={{ maxWidth: 400 }}>
          <h2 style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 44, lineHeight: 1.02, letterSpacing: "-0.03em", margin: "0 0 18px" }}>
            Bora fechar<br />mais um? <span style={{ color: color.accent }}>→</span>
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: color.gray300, margin: "0 0 34px" }}>
            Entre e monte sua próxima proposta em minutos. Seu cliente merece ver seu trabalho num formato à altura.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {["Propostas ilimitadas no plano Pro", "Você sabe quando o cliente abriu", "Aceite com um clique"].map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 15, color: color.gray200 }}>
                <span style={{ color: color.accent, display: "flex" }}><Check size={18} strokeWidth={2.4} /></span>{t}
              </div>
            ))}
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
            {isLogin ? "Que bom te ver de novo" : "Crie sua conta grátis"}
          </h1>
          <p style={{ fontSize: 15, color: color.gray500, margin: "0 0 28px" }}>
            {isLogin ? "Entre para acompanhar suas propostas." : "Leva menos de um minuto. Não precisa de cartão."}
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
                {isLogin && <button type="button" onClick={() => {}} className="au-link au-linksm">Esqueci a senha</button>}
              </div>
              <input className="au-input" type="password" value={form.password} onChange={upd("password")} placeholder="••••••••" autoComplete={isLogin ? "current-password" : "new-password"} required />
            </label>

            {err && <div role="alert" style={{ fontSize: 13.5, color: "#B4443C", background: "#FDECEA", border: "1px solid #F5D2CD", padding: "10px 12px", borderRadius: 9 }}>{err}</div>}

            <button type="submit" disabled={busy} className="au-btn au-submit">
              {busy ? "Só um instante…" : isLogin ? "Entrar" : "Criar conta grátis"}
            </button>
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "22px 0" }}>
            <span style={{ flex: 1, height: 1, background: color.line }} />
            <span style={{ fontSize: 13, color: color.gray400 }}>ou</span>
            <span style={{ flex: 1, height: 1, background: color.line }} />
          </div>

          <button onClick={() => setEntering(true)} className="au-btn au-google">
            <GoogleIcon />{isLogin ? "Entrar com Google" : "Cadastrar com Google"}
          </button>

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
          <div className="au-enter-mark">M</div>
          <div className="au-enter-title">{isLogin ? "Bora fechar mais um" : `Boas-vindas${firstName ? ", " + firstName : ""}`}</div>
          <div className="au-enter-sub">Preparando seu espaço…</div>
          <div className="au-enter-bar"><span /></div>
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
