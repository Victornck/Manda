import { useEffect, useRef, useState } from "react";
import { X, Send, ArrowRight, MessageCircle } from "lucide-react";
import { font, color } from "../theme.js";
import { searchSupport, topicById, SUPPORT_STARTERS } from "../lib/support.js";
import ReportProblem from "./ReportProblem.jsx";

const startersList = () => SUPPORT_STARTERS.map(topicById).filter(Boolean);

// Tempo do "digitando" antes da resposta. Proporcional ao tamanho do texto,
// com uma leve variação, para não parecer instantâneo nem robótico.
const thinkTime = (text) => Math.round(Math.min(1900, 700 + String(text || "").length * 7 + Math.random() * 220));

function MMark({ size = 26 }) {
  return (
    <span style={{ width: size, height: size, flex: "none", borderRadius: Math.round(size * 0.28), background: color.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <img src="/logo-mark-white.svg" alt="Manda" style={{ width: "60%", height: "60%", display: "block" }} />
    </span>
  );
}

// Núcleo da conversa (usado no painel do desktop e na página do mobile).
export function SupportChatBody({ variant = "panel" }) {
  const [msgs, setMsgs] = useState([{ from: "bot", text: "Oi! Sou a ajuda do Manda. Posso explicar qualquer campo ou recurso. Sobre o que é a sua dúvida?", chips: startersList(), chipsLabel: "Perguntas rápidas" }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [msgs, typing]);
  useEffect(() => { const t = setTimeout(() => inputRef.current && inputRef.current.focus(), 80); return () => clearTimeout(t); }, []);

  const reply = (query) => {
    const { best, related } = searchSupport(query);
    if (best) return { text: best.a, chips: related.slice(0, 3), chipsLabel: related.length ? "Veja também" : "" };
    return { text: "Não achei exatamente isso. Talvez um destes ajude, ou tente reformular a pergunta.", chips: (related.length ? related : startersList()).slice(0, 4), chipsLabel: "Talvez você queira" };
  };

  const push = (msg) => setMsgs((m) => [...m, msg]);

  const ask = (text) => {
    const q = String(text || "").trim();
    if (!q || typing) return;
    push({ from: "user", text: q });
    setInput("");
    setTyping(true);
    const r = reply(q);
    setTimeout(() => { setTyping(false); push({ from: "bot", ...r }); }, thinkTime(r.text));
  };

  const askTopic = (topic) => {
    if (typing) return;
    push({ from: "user", text: topic.q });
    setTyping(true);
    const { related } = searchSupport(topic.kw.join(" "));
    const chips = related.filter((r) => r.id !== topic.id).slice(0, 3);
    setTimeout(() => {
      setTyping(false);
      push({ from: "bot", text: topic.a, chips, chipsLabel: chips.length ? "Veja também" : "" });
    }, thinkTime(topic.a));
  };

  return (
    <div className={variant === "page" ? "scb scb-page" : "scb"}>
      <div className="scb-scroll" ref={scrollRef}>
        {msgs.map((m, i) => {
          if (m.from === "user") return <div key={i} className="scb-row me"><div className="scb-bub me">{m.text}</div></div>;
          const firstOfGroup = i === 0 || msgs[i - 1].from !== "bot";
          return (
            <div key={i}>
              <div className="scb-row">
                <span className="scb-slot">{firstOfGroup ? <MMark size={26} /> : null}</span>
                <div className="scb-bub bot">{m.text}</div>
              </div>
              {m.chips && m.chips.length > 0 && (<>
                {m.chipsLabel && <div className="scb-kick">{m.chipsLabel}</div>}
                <div className="scb-chips">
                  {m.chips.map((t) => (
                    <button key={t.id} className="scb-chip" onClick={() => askTopic(t)}>
                      <span>{t.q}</span><ArrowRight size={15} strokeWidth={2.2} />
                    </button>
                  ))}
                </div>
              </>)}
            </div>
          );
        })}
        {typing && <div className="scb-row"><span className="scb-slot"><MMark size={26} /></span><div className="scb-dots"><i /><i /><i /></div></div>}
      </div>

      <form className="scb-foot" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
        <input ref={inputRef} className="scb-in" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escreva sua dúvida…" maxLength={200} aria-label="Sua dúvida" />
        <button type="submit" className="scb-send" disabled={!input.trim() || typing} aria-label="Enviar"><Send size={17} strokeWidth={2.2} /></button>
      </form>

      <style>{`
        .scb{ display:flex; flex-direction:column; height:100%; min-height:0; background:#FAF7F3; }
        .scb-page{ background:#fff; }
        .scb-scroll{ flex:1; overflow-y:auto; padding:18px 16px 20px; display:flex; flex-direction:column; gap:6px; }
        .scb-page .scb-scroll{ padding:26px 22px 24px; gap:8px; }
        .scb-page .scb-bub{ font-size:14.5px; }
        .scb-page .scb-chip{ font-size:13.5px; padding:12px 15px; }
        .scb-page .scb-foot{ padding:14px 22px 18px; }
        .scb-row{ display:flex; gap:9px; align-items:flex-end; margin-top:8px; }
        .scb-row.me{ justify-content:flex-end; }
        .scb-slot{ width:26px; flex:none; display:flex; }
        .scb-bub{ max-width:80%; font-family:${font.body}; font-size:14px; line-height:1.55; padding:11px 14px; border-radius:16px; }
        .scb-bub.bot{ background:#fff; color:${color.ink}; border:1px solid #ECE6DF; border-bottom-left-radius:5px; box-shadow:0 1px 2px rgba(30,25,20,0.04); }
        .scb-bub.me{ background:${color.ink}; color:#fff; border-bottom-right-radius:5px; }
        .scb-kick{ font-family:${font.heading}; font-size:10.5px; font-weight:700; letter-spacing:0.11em; text-transform:uppercase; color:${color.gray400}; margin:12px 0 7px 35px; }
        .scb-chips{ display:flex; flex-direction:column; gap:8px; margin-left:35px; }
        .scb-chip{ display:flex; align-items:center; justify-content:space-between; gap:12px; text-align:left; font-family:${font.body}; font-size:13px; font-weight:500; color:${color.ink}; background:#fff; border:1px solid #ECE6DF; border-left:2.5px solid ${color.accent}; border-radius:11px; padding:10px 13px; cursor:pointer; transition:transform .14s ease, box-shadow .14s ease, border-color .14s ease; }
        .scb-chip:hover{ transform:translateX(3px); box-shadow:0 8px 20px -12px rgba(30,25,20,0.35); }
        .scb-chip svg{ color:${color.accent}; flex:none; opacity:.55; transition:opacity .14s ease, transform .14s ease; }
        .scb-chip:hover svg{ opacity:1; transform:translateX(3px); }
        .scb-dots{ display:flex; gap:4px; padding:13px 15px; background:#fff; border:1px solid #ECE6DF; border-radius:16px; border-bottom-left-radius:5px; }
        .scb-dots i{ width:6px; height:6px; border-radius:50%; background:${color.accent}; opacity:.55; animation:scbDot 1s infinite ease-in-out; }
        .scb-dots i:nth-child(2){ animation-delay:.15s; } .scb-dots i:nth-child(3){ animation-delay:.3s; }
        @keyframes scbDot{ 0%,60%,100%{ transform:translateY(0); opacity:.4; } 30%{ transform:translateY(-4px); opacity:1; } }
        .scb-foot{ flex:none; display:flex; gap:9px; padding:13px 14px; background:#fff; border-top:1px solid #ECE6DF; }
        .scb-in{ flex:1; min-width:0; border:1px solid ${color.gray200}; border-radius:12px; padding:11px 13px; font-family:${font.body}; font-size:14px; color:${color.ink}; outline:none; background:${color.surface3}; transition:border-color .14s ease, box-shadow .14s ease, background .14s ease; }
        .scb-in::placeholder{ color:${color.gray400}; }
        .scb-in:focus{ border-color:${color.accent}; background:#fff; box-shadow:0 0 0 3px rgba(217,119,87,0.14); }
        .scb-send{ width:44px; height:44px; flex:none; border:none; border-radius:12px; background:${color.accent}; color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background .15s ease, opacity .15s ease, transform .12s ease; }
        .scb-send:hover:not(:disabled){ background:#C4573B; }
        .scb-send:active:not(:disabled){ transform:scale(.94); }
        .scb-send:disabled{ opacity:.45; cursor:default; }
        @media (prefers-reduced-motion: reduce){ .scb-dots i{ animation:none; } }
      `}</style>
    </div>
  );
}

// Página cheia (usada no mobile e como aba de Suporte). Fundo branco, cabeçalho
// e conversa na mesma coluna centralizada.
export function SupportPage({ userEmail = "" }) {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#fff" }}>
      <div style={{ flex: 1, minHeight: 0, width: "100%", maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: "none", borderBottom: "1px solid #ECE6DF", padding: "20px 22px", display: "flex", alignItems: "center", gap: 13 }}>
          <MMark size={40} />
          <div>
            <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 20, letterSpacing: "-0.02em" }}>Ajuda do Manda</div>
            <div style={{ fontSize: "13px", color: color.gray500 }}>Tire dúvidas sobre qualquer campo ou recurso.</div>
          </div>
          <div style={{ marginLeft: "auto" }}><ReportProblem email={userEmail} /></div>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <SupportChatBody variant="page" />
        </div>
      </div>
    </div>
  );
}

// Painel flutuante (desktop). No mobile, o botão leva para a página de Suporte.
export default function SupportChat({ raised = false, onOpenPage }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handleClick = () => {
    const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;
    if (isMobile && onOpenPage) onOpenPage();
    else setOpen((v) => !v);
  };

  return (
    <>
      <style>{`
        .sc-fab{ position:fixed; right:22px; bottom:22px; z-index:120; display:inline-flex; align-items:center; gap:9px; height:50px; padding:0 18px 0 15px; border-radius:999px; border:none; cursor:pointer; background:${color.ink}; color:#fff; font-family:${font.heading}; font-weight:700; font-size:14.5px; letter-spacing:-0.01em; box-shadow:0 14px 34px -12px rgba(0,0,0,0.5); transition:transform .16s ease, background .16s ease; }
        .sc-fab:hover{ transform:translateY(-2px); background:#262626; }
        .sc-fab:active{ transform:scale(.97); }
        .sc-raised{ bottom:92px; }
        .sc-panel{ position:fixed; right:22px; bottom:22px; z-index:121; width:392px; max-width:calc(100vw - 32px); height:588px; max-height:calc(100vh - 44px); background:#fff; border:1px solid #ECE6DF; border-radius:20px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 44px 96px -30px rgba(30,20,10,0.5); animation:scUp .22s cubic-bezier(.2,.8,.2,1) both; }
        .sc-panel.sc-raised{ bottom:92px; }
        @keyframes scUp{ from{ opacity:0; transform:translateY(14px) scale(.985); } to{ opacity:1; transform:none; } }
        .sc-head{ flex:none; display:flex; align-items:center; gap:12px; padding:15px 16px; background:#fff; border-bottom:1px solid #ECE6DF; }
        /* No mobile o botão flutuante some; a ajuda fica só pela aba Suporte. */
        @media (max-width:640px){ .sc-fab{ display:none !important; } }
        @media (prefers-reduced-motion: reduce){ .sc-panel{ animation:none; } }
      `}</style>

      {!open && (
        <button className={raised ? "sc-fab sc-raised" : "sc-fab"} onClick={handleClick} aria-label="Abrir ajuda">
          <MessageCircle size={20} strokeWidth={2.2} />Ajuda
        </button>
      )}

      {open && (
        <div className={raised ? "sc-panel sc-raised" : "sc-panel"} role="dialog" aria-label="Ajuda do Manda">
          <div className="sc-head">
            <MMark size={34} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 15.5, letterSpacing: "-0.01em" }}>Ajuda do Manda</div>
              <div style={{ fontSize: 12, color: color.gray500 }}>Dúvidas sobre os campos, na hora.</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Fechar" style={{ background: "none", border: "none", color: color.gray400, cursor: "pointer", padding: 4 }}><X size={20} strokeWidth={2} /></button>
          </div>
          <SupportChatBody />
        </div>
      )}
    </>
  );
}
