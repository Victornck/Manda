import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Check, FileWarning } from "lucide-react";
import { font, color } from "../theme.js";
import { ProposalDesign } from "../templates/designs.jsx";
import { decodeProposal } from "../lib/share.js";
import { loadProposals, upsertProposal } from "../lib/drafts.js";

export default function PublicProposal() {
  const { token } = useParams();
  const doc = useMemo(() => decodeProposal(token), [token]);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    document.title = doc ? `${doc.title || "Proposta"} · Manda` : "Proposta · Manda";
  }, [doc]);

  if (!doc) {
    return (
      <div style={{ minHeight: "100vh", background: color.surface2, fontFamily: font.body, color: color.ink, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <div style={{ width: 56, height: 56, margin: "0 auto 16px", borderRadius: 14, background: "#FDECEA", color: "#B4443C", display: "flex", alignItems: "center", justifyContent: "center" }}><FileWarning size={26} strokeWidth={1.9} /></div>
          <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Link inválido</div>
          <p style={{ fontSize: 14.5, color: color.gray500, margin: 0 }}>Este link de proposta está quebrado ou incompleto. Peça um novo para quem te enviou.</p>
        </div>
      </div>
    );
  }

  const onAccept = () => {
    // Se a proposta existe neste navegador (mesmo dispositivo), marca como Aceita no painel.
    if (doc.__id) {
      const found = loadProposals().find((r) => r.id === doc.__id);
      if (found) upsertProposal({ ...found, status: "Aceita" });
    }
    setAccepted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div style={{ minHeight: "100vh", background: color.surface2, fontFamily: font.body, color: color.ink, padding: "clamp(24px,5vw,56px) 20px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        {accepted && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#EAF5EE", border: "1px solid #C9E7D5", color: "#2E7D51", borderRadius: 14, padding: "16px 18px", marginBottom: 18, animation: "mandaFadeUp .3s ease both" }}>
            <span style={{ width: 34, height: 34, flex: "none", borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={18} strokeWidth={3} /></span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Proposta aceita!</div>
              <div style={{ fontSize: 13.5, color: "#3f7a58" }}>Combinado. Quem te enviou vai dar seguimento.</div>
            </div>
          </div>
        )}
        <div style={{ pointerEvents: accepted ? "none" : "auto", opacity: accepted ? 0.75 : 1, transition: "opacity .2s ease" }}>
          <ProposalDesign id={doc.template} doc={doc} accent={doc.accent} onAccept={accepted ? undefined : onAccept} />
        </div>
        <div style={{ textAlign: "center", marginTop: 22, fontSize: 13, color: color.gray400 }}>
          Proposta enviada via <Link to="/" style={{ fontWeight: 600, color: color.gray500 }}>Manda</Link>
        </div>
      </div>
    </div>
  );
}
