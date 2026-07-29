import { useEffect, useState } from "react";
import { X, Paperclip, Check, Send, AlertCircle } from "lucide-react";
import { font, color } from "../theme.js";
import { api } from "../lib/api.js";

const CATS = [
  ["bug", "Bug"],
  ["sugestao", "Sugestão"],
  ["duvida", "Dúvida"],
  ["cobranca", "Cobrança"],
  ["outro", "Outro"],
];

// Comprime o print no navegador antes de enviar: reduz para no máx. 1400px de
// largura e salva em JPEG. Assim o corpo não estoura o limite do backend.
function fileToCompressedDataUrl(file, maxW = 1400, quality = 0.7) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Anexe uma imagem."));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxW / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      let q = quality;
      let out = c.toDataURL("image/jpeg", q);
      while (out.length > 2_400_000 && q > 0.3) { q -= 0.15; out = c.toDataURL("image/jpeg", q); }
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Imagem inválida.")); };
    img.src = url;
  });
}

// Botão "Relatar problema" + modal. Recebe o e-mail da conta para pré-preencher.
export default function ReportProblem({ email = "" }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("bug");
  const [message, setMessage] = useState("");
  const [mail, setMail] = useState(email);
  const [shot, setShot] = useState(null);
  const [shotName, setShotName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setMail(email); }, [email]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const reset = () => {
    setCategory("bug"); setMessage(""); setMail(email);
    setShot(null); setShotName(""); setBusy(false); setSent(false); setError("");
  };
  const close = () => { setOpen(false); setTimeout(reset, 200); };

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite reanexar o mesmo arquivo
    if (!file) return;
    setError("");
    try {
      const data = await fileToCompressedDataUrl(file);
      setShot(data); setShotName(file.name);
    } catch (err) { setError(err.message || "Não foi possível ler a imagem."); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!message.trim() || busy) return;
    setBusy(true); setError("");
    try {
      await api.reportProblem({
        category,
        message: message.trim(),
        email: mail.trim(),
        pageUrl: window.location.href,
        screenshot: shot || undefined,
      });
      setSent(true);
    } catch (err) {
      setError(err.message || "Não foi possível enviar. Tente de novo.");
    }
    setBusy(false);
  };

  return (
    <>
      <button className="rp-open" onClick={() => setOpen(true)}>
        <span className="rp-open-ic"><AlertCircle size={14} strokeWidth={2.4} /></span>
        Relatar problema
      </button>
      <style>{`
        .rp-open{ display:inline-flex; align-items:center; gap:8px; font-family:${font.body}; font-size:13.5px; font-weight:600; color:${color.ink}; background:#fff; border:1px solid ${color.gray200}; border-radius:999px; padding:7px 15px 7px 8px; cursor:pointer; transition:border-color .15s ease, color .15s ease, box-shadow .15s ease, transform .12s ease; }
        .rp-open:hover{ border-color:${color.accent}; color:${color.accent}; box-shadow:0 8px 20px -12px rgba(217,119,87,0.55); }
        .rp-open:active{ transform:scale(.97); }
        .rp-open-ic{ display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; border-radius:50%; background:${color.accentTint}; color:${color.accent}; flex:none; }
      `}</style>

      {open && (
        <div className="rp-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="rp-card" role="dialog" aria-label="Relatar problema">
            <div className="rp-head">
              <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em" }}>
                {sent ? "Relato enviado" : "Relatar problema"}
              </div>
              <button onClick={close} aria-label="Fechar" className="rp-x"><X size={19} strokeWidth={2} /></button>
            </div>

            {sent ? (
              <div className="rp-done">
                <span className="rp-check"><Check size={26} strokeWidth={2.4} /></span>
                <p className="rp-done-t">Recebido. Obrigado!</p>
                <p className="rp-done-s">Vou olhar isso pessoalmente. Se deixou seu e-mail, respondo por lá.</p>
                <button className="rp-send" onClick={close}>Fechar</button>
              </div>
            ) : (
              <form className="rp-body" onSubmit={submit}>
                <label className="rp-lb">Tipo</label>
                <div className="rp-cats">
                  {CATS.map(([id, lb]) => (
                    <button type="button" key={id} onClick={() => setCategory(id)} className={category === id ? "rp-cat on" : "rp-cat"}>{lb}</button>
                  ))}
                </div>

                <label className="rp-lb">O que aconteceu?</label>
                <textarea
                  className="rp-ta" value={message} onChange={(e) => setMessage(e.target.value)}
                  placeholder="Descreva o problema ou a ideia. Quanto mais detalhe, melhor." maxLength={2000} rows={4} autoFocus
                />

                <label className="rp-lb">Seu e-mail (para eu responder)</label>
                <input className="rp-in" type="email" value={mail} onChange={(e) => setMail(e.target.value)} placeholder="voce@email.com" />

                <label className="rp-lb">Print da tela (opcional)</label>
                {shot ? (
                  <div className="rp-shot">
                    <img src={shot} alt="" className="rp-thumb" />
                    <span className="rp-shot-nm">{shotName || "imagem"}</span>
                    <button type="button" className="rp-rm" onClick={() => { setShot(null); setShotName(""); }}>Remover</button>
                  </div>
                ) : (
                  <label className="rp-attach">
                    <Paperclip size={15} strokeWidth={2.2} />Anexar print
                    <input type="file" accept="image/*" onChange={pickFile} hidden />
                  </label>
                )}

                {error && <div className="rp-err">{error}</div>}

                <button type="submit" className="rp-send" disabled={!message.trim() || busy}>
                  {busy ? "Enviando…" : (<><Send size={16} strokeWidth={2.2} />Enviar relato</>)}
                </button>
              </form>
            )}
          </div>

          <style>{`
            .rp-overlay{ position:fixed; inset:0; z-index:200; background:rgba(30,25,20,0.42); display:flex; align-items:center; justify-content:center; padding:18px; animation:rpFade .16s ease both; }
            .rp-card{ width:460px; max-width:100%; max-height:calc(100vh - 36px); overflow-y:auto; background:#fff; border:1px solid #ECE6DF; border-radius:20px; box-shadow:0 44px 96px -30px rgba(30,20,10,0.5); animation:rpUp .22s cubic-bezier(.2,.8,.2,1) both; }
            .rp-head{ display:flex; align-items:center; justify-content:space-between; padding:18px 20px 14px; border-bottom:1px solid #F0EAE2; }
            .rp-x{ background:none; border:none; color:${color.gray400}; cursor:pointer; padding:4px; display:flex; }
            .rp-x:hover{ color:${color.ink}; }
            .rp-body{ padding:16px 20px 20px; }
            .rp-lb{ display:block; font-family:${font.heading}; font-size:11px; font-weight:700; letter-spacing:0.09em; text-transform:uppercase; color:${color.gray400}; margin:14px 0 8px; }
            .rp-body .rp-lb:first-child{ margin-top:2px; }
            .rp-cats{ display:flex; flex-wrap:wrap; gap:7px; }
            .rp-cat{ font-family:${font.body}; font-size:13px; font-weight:600; color:${color.ink}; background:#fff; border:1px solid ${color.gray200}; border-radius:999px; padding:7px 14px; cursor:pointer; transition:all .14s ease; }
            .rp-cat:hover{ border-color:${color.accent}; }
            .rp-cat.on{ background:${color.ink}; color:#fff; border-color:${color.ink}; }
            .rp-ta,.rp-in{ width:100%; box-sizing:border-box; font-family:${font.body}; font-size:14px; color:${color.ink}; background:${color.surface3}; border:1px solid ${color.gray200}; border-radius:12px; padding:12px 13px; outline:none; resize:vertical; transition:border-color .14s ease, box-shadow .14s ease, background .14s ease; }
            .rp-ta::placeholder,.rp-in::placeholder{ color:${color.gray400}; }
            .rp-ta:focus,.rp-in:focus{ border-color:${color.accent}; background:#fff; box-shadow:0 0 0 3px rgba(217,119,87,0.14); }
            .rp-attach{ display:inline-flex; align-items:center; gap:8px; font-family:${font.body}; font-size:13.5px; font-weight:600; color:${color.ink}; background:#fff; border:1px dashed ${color.gray200}; border-radius:11px; padding:11px 15px; cursor:pointer; transition:border-color .14s ease, color .14s ease; }
            .rp-attach:hover{ border-color:${color.accent}; color:${color.accent}; }
            .rp-attach svg{ color:${color.accent}; }
            .rp-shot{ display:flex; align-items:center; gap:11px; background:${color.surface3}; border:1px solid ${color.gray200}; border-radius:12px; padding:9px 11px; }
            .rp-thumb{ width:44px; height:44px; object-fit:cover; border-radius:8px; flex:none; border:1px solid #E6DCCF; }
            .rp-shot-nm{ flex:1; min-width:0; font-size:13px; color:${color.gray500}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
            .rp-rm{ flex:none; background:none; border:none; color:${color.accent}; font-family:${font.body}; font-size:13px; font-weight:600; cursor:pointer; padding:4px 6px; }
            .rp-err{ display:flex; align-items:center; gap:7px; margin-top:14px; font-size:13px; color:#C4573B; background:#FBF2EC; border:1px solid #EED9CD; border-radius:10px; padding:10px 12px; }
            .rp-send{ display:inline-flex; align-items:center; justify-content:center; gap:8px; width:100%; margin-top:18px; font-family:${font.body}; font-weight:700; font-size:15px; color:#fff; background:${color.ink}; border:none; border-radius:12px; padding:13px 20px; cursor:pointer; transition:background .15s ease, opacity .15s ease, transform .12s ease; }
            .rp-send:hover:not(:disabled){ background:#262626; }
            .rp-send:active:not(:disabled){ transform:scale(.985); }
            .rp-send:disabled{ opacity:.45; cursor:default; }
            .rp-done{ padding:30px 24px 26px; text-align:center; }
            .rp-check{ display:inline-flex; align-items:center; justify-content:center; width:56px; height:56px; border-radius:50%; background:#EAF6EE; color:#2E8B57; margin-bottom:16px; }
            .rp-done-t{ margin:0 0 6px; font-family:${font.heading}; font-weight:800; font-size:20px; letter-spacing:-0.02em; color:${color.ink}; }
            .rp-done-s{ margin:0 auto; max-width:320px; font-size:14px; line-height:1.55; color:${color.gray500}; }
            .rp-done .rp-send{ width:auto; padding:11px 26px; margin-top:22px; }
            @keyframes rpFade{ from{ opacity:0; } to{ opacity:1; } }
            @keyframes rpUp{ from{ opacity:0; transform:translateY(14px) scale(.985); } to{ opacity:1; transform:none; } }
            @media (prefers-reduced-motion: reduce){ .rp-overlay,.rp-card{ animation:none; } }
          `}</style>
        </div>
      )}
    </>
  );
}
