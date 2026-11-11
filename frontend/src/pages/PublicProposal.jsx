import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Check, FileWarning, X } from "lucide-react";
import { font, color } from "../theme.js";
import { ProposalDesign } from "../templates/designs.jsx";
import { api } from "../lib/api.js";

// "10/11 às 14h32", sempre no horário de Brasília: é o mesmo instante que fica
// registrado no servidor, lido do mesmo jeito por quem envia e por quem aceita,
// esteja o aparelho de cada um em que fuso estiver.
function whenLabel(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || isNaN(d.getTime())) return "";
  const tz = "America/Sao_Paulo";
  const day = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: tz });
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }).replace(":", "h");
  return `${day} às ${time}`;
}

export default function PublicProposal() {
  // A rota é /p/:token — aqui o token é o public_id curto da proposta.
  const { token: publicId } = useParams();
  const [doc, setDoc] = useState(null);
  const [state, setState] = useState("loading"); // loading | ok | notfound | error
  // Resposta do cliente: null (em aberto) | "accepted" | "declined". Só vira
  // "accepted" depois que o SERVIDOR confirma — antes a tela mostrava "aceita"
  // na hora do clique e engolia o erro se a requisição falhasse.
  const [decision, setDecision] = useState(null);
  const [decidedAt, setDecidedAt] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptErr, setAcceptErr] = useState("");

  useEffect(() => {
    let alive = true;
    setState("loading");
    api.publicProposal(publicId)
      .then((r) => {
        if (!alive) return;
        setDoc(r.proposal);
        setDecision(["accepted", "declined"].includes(r.proposal.status) ? r.proposal.status : null);
        setDecidedAt(r.proposal.decidedAt || null);
        setState("ok");
        // Confirma a visualização REAL. Só roda em navegador de verdade —
        // bots de link-preview (WhatsApp, etc.) não executam este JS.
        api.viewPublic(publicId).catch(() => {});
      })
      .catch((e) => {
        if (!alive) return;
        setState(/não encontrada|not found|404/i.test(e.message || "") ? "notfound" : "error");
      });
    return () => { alive = false; };
  }, [publicId]);

  useEffect(() => {
    document.title = doc ? `${doc.title || "Proposta"} · Manda` : "Proposta · Manda";
  }, [doc]);

  const onAccept = async () => {
    if (accepting || decision) return; // clique repetido não dispara nada
    setAccepting(true);
    setAcceptErr("");
    try {
      const r = await api.acceptPublic(publicId);
      setDecision(r.status === "declined" ? "declined" : "accepted");
      setDecidedAt(r.decidedAt || new Date().toISOString());
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setAcceptErr("Não foi possível registrar o aceite agora. Confira sua conexão e toque em aceitar de novo.");
    } finally {
      setAccepting(false);
    }
  };

  const centered = (children) => (
    <div style={{ minHeight: "100vh", background: color.surface2, fontFamily: font.body, color: color.ink, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 360 }}>{children}</div>
    </div>
  );

  if (state === "loading") {
    return centered(
      <>
        <style>{`@keyframes ppSpin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: 30, height: 30, margin: "0 auto 14px", border: `3px solid ${color.gray200}`, borderTopColor: color.accent, borderRadius: "50%", animation: "ppSpin .7s linear infinite" }} />
        <p style={{ fontSize: 14.5, color: color.gray500, margin: 0 }}>Carregando proposta…</p>
      </>
    );
  }

  if (state !== "ok" || !doc) {
    const notFound = state === "notfound";
    return centered(
      <>
        <div style={{ width: 56, height: 56, margin: "0 auto 16px", borderRadius: 14, background: "#FDECEA", color: "#B4443C", display: "flex", alignItems: "center", justifyContent: "center" }}><FileWarning size={26} strokeWidth={1.9} /></div>
        <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 20, marginBottom: 6 }}>{notFound ? "Proposta não encontrada" : "Não foi possível abrir"}</div>
        <p style={{ fontSize: 14.5, color: color.gray500, margin: 0 }}>
          {notFound
            ? "Este link pode ter expirado ou sido removido. Peça um novo para quem te enviou."
            : "Tivemos um problema para carregar esta proposta. Tente atualizar a página em instantes."}
        </p>
      </>
    );
  }

  const accepted = decision === "accepted";
  const declined = decision === "declined";
  const when = whenLabel(decidedAt);

  return (
    <div style={{ minHeight: "100vh", background: color.surface2, fontFamily: font.body, color: color.ink, padding: "clamp(24px,5vw,56px) 20px" }}>
      {/* Proposta já respondida: o botão de aceitar que vem dentro do modelo
          some (cada modelo desenha o seu, então é escondido por aqui) e no lugar
          dele entra a confirmação com data e hora. Sem botão, não há segundo clique. */}
      <style>{`.pp-doc.pp-closed button{ display:none !important; }`}</style>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        {accepted && (
          <div role="status" style={{ display: "flex", alignItems: "center", gap: 12, background: "#EAF5EE", border: "1px solid #C9E7D5", color: "#2E7D51", borderRadius: 14, padding: "16px 18px", marginBottom: 18, animation: "mandaFadeUp .3s ease both" }}>
            <span style={{ width: 34, height: 34, flex: "none", borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={18} strokeWidth={3} /></span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{when ? `Proposta aceita em ${when}` : "Proposta aceita!"}</div>
              <div style={{ fontSize: 13.5, color: "#3f7a58" }}>Combinado. Quem te enviou já foi avisado e vai dar seguimento.</div>
            </div>
          </div>
        )}
        {declined && (
          <div role="status" style={{ display: "flex", alignItems: "center", gap: 12, background: color.surface, border: `1px solid ${color.line}`, color: color.gray700, borderRadius: 14, padding: "16px 18px", marginBottom: 18 }}>
            <span style={{ width: 34, height: 34, flex: "none", borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18} strokeWidth={2.6} /></span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{when ? `Proposta recusada em ${when}` : "Proposta recusada"}</div>
              <div style={{ fontSize: 13.5, color: color.gray500 }}>Esta proposta não está mais aberta para aceite.</div>
            </div>
          </div>
        )}
        <div className={`pp-doc${decision ? " pp-closed" : ""}`} aria-busy={accepting} style={{ pointerEvents: accepting ? "none" : "auto", opacity: accepting ? 0.6 : 1, transition: "opacity .2s ease" }}>
          <ProposalDesign id={doc.template} doc={doc} accent={doc.accent} onAccept={decision ? undefined : onAccept} />
        </div>
        {accepting && <div role="status" style={{ textAlign: "center", marginTop: 14, fontSize: 14, color: color.gray500 }}>Registrando seu aceite…</div>}
        {acceptErr && !decision && (
          <div role="alert" style={{ marginTop: 14, fontSize: 14, color: "#B4443C", background: "#FDECEA", border: "1px solid #F5D2CD", borderRadius: 12, padding: "12px 14px", textAlign: "center" }}>{acceptErr}</div>
        )}
        {accepted && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 16, fontSize: 15, fontWeight: 700, color: "#2E7D51", background: "#EAF5EE", border: "1px solid #C9E7D5", borderRadius: 12, padding: "15px 16px", textAlign: "center" }}>
            <Check size={18} strokeWidth={3} style={{ flex: "none" }} />
            <span>{when ? `Proposta aceita em ${when}` : "Proposta aceita"}{when ? <span style={{ fontWeight: 500, color: "#3f7a58" }}> (horário de Brasília)</span> : null}</span>
          </div>
        )}
        <div style={{ textAlign: "center", marginTop: 22, fontSize: 13, color: color.gray400 }}>
          Proposta enviada via <Link to="/" title="Conheça o Manda" style={{ fontWeight: 800, color: color.ink, textUnderlineOffset: 3 }} onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }} onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}>Manda</Link>
        </div>
      </div>
    </div>
  );
}
