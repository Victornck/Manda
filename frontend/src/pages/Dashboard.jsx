import { useEffect, useMemo, useState } from "react";
import {
  Plus, FileText, LayoutGrid, Users, Settings, ArrowLeft, Image as ImageIcon,
  Trash2, Search, LogOut, User, Link2, Mail, Pencil, Check, AlertTriangle,
} from "lucide-react";
import { font, color, statusColors, avatarPalette, brl, initials } from "../theme.js";
import { getCurrentUser } from "../lib/supabase.js";
import { loadProposals, upsertProposal, removeProposal, newId } from "../lib/drafts.js";
import { encodeProposal } from "../lib/share.js";
import { DESIGNS, ProposalDesign, SAMPLE_DOC } from "../templates/designs.jsx";

const FILTERS = {
  Todas: null,
  Enviadas: ["Enviada", "Visualizada", "Aceita", "Recusada"],
  Aceitas: ["Aceita"],
  Pendentes: ["Enviada", "Visualizada"],
  Rascunhos: ["Rascunho"],
};

const BLANK_DOC = {
  client: "", company: "", clientEmail: "", title: "",
  scope: "", items: [{ desc: "", value: "" }],
  start: "", end: "", payment: "", revisions: "", validity: "", bio: "",
  accent: "#D97757", logo: null, template: "minimal",
};

const MAX_ITEMS = 20;
const STATUS_OPTIONS = ["Rascunho", "Enviada", "Visualizada", "Aceita", "Recusada"];

// Cores disponíveis para personalizar a proposta.
const SWATCHES = ["#D97757", "#3A5BB5", "#2E7D51", "#6C48B0", "#0A0A0A"];

const STEPS = [
  "Organizando cada detalhe da sua proposta",
  "Deixando com cara de agência",
  "Somando o investimento",
  "Gerando seu link exclusivo",
];

export default function Dashboard({ go }) {
  const [view, setView] = useState("list");
  const [filter, setFilter] = useState("Todas");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState(() => loadProposals());
  const [user, setUser] = useState(null);
  const [doc, setDoc] = useState(BLANK_DOC);
  const [draftId, setDraftId] = useState(null);
  const [flow, setFlow] = useState("editing"); // editing | finishing | done
  const [step, setStep] = useState(0);
  const [sealing, setSealing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [intro, setIntro] = useState(() => { try { return sessionStorage.getItem("manda_entering") === "1"; } catch { return false; } });

  useEffect(() => {
    getCurrentUser().then((u) => setUser(u)).catch(() => {});
  }, []);

  // Dissolve a tela de entrada revelando o painel (transição suave vinda do login).
  useEffect(() => {
    if (!intro) return;
    try { sessionStorage.removeItem("manda_entering"); } catch { /* ignore */ }
    const t = setTimeout(() => setIntro(false), 900);
    return () => clearTimeout(t);
  }, []);

  const updDoc = (field) => (e) => { const v = e.target.value; setDoc((d) => ({ ...d, [field]: v })); };
  const updItem = (i, key) => (e) => {
    let v = e.target.value;
    if (key === "value") v = v.replace(/[^0-9]/g, "");
    setDoc((d) => ({ ...d, items: d.items.map((it, idx) => (idx === i ? { ...it, [key]: v } : it)) }));
  };
  const addItem = () => setDoc((d) => (d.items.length >= MAX_ITEMS ? d : { ...d, items: [...d.items, { desc: "", value: "" }] }));
  const removeItem = (i) => () => setDoc((d) => ({ ...d, items: d.items.filter((_, idx) => idx !== i) }));

  const shareUrl = () => `${window.location.origin}/p/${encodeProposal({ ...doc, __id: draftId })}`;
  const copyLink = () => {
    const url = shareUrl();
    if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const sendByEmail = () => {
    const url = shareUrl();
    const subject = encodeURIComponent(`Proposta: ${doc.title || "sua proposta"}`);
    const body = encodeURIComponent(`Olá${doc.client ? ", " + doc.client : ""}!\n\nSegue a proposta: ${url}\n\nQualquer dúvida, é só responder.`);
    window.location.href = `mailto:${doc.clientEmail || ""}?subject=${subject}&body=${body}`;
  };

  const total = doc.items.reduce((a, it) => a + (parseInt(it.value, 10) || 0), 0);
  const itemCount = doc.items.filter((it) => it.desc || it.value).length;
  const hasContent = doc.client || doc.company || doc.title || doc.scope || doc.start || doc.end ||
    doc.payment || doc.revisions || doc.validity || doc.bio || doc.items.some((it) => it.desc || it.value);
  const canFinish = doc.client.trim() !== "" && doc.title.trim() !== "";

  const buildProposal = (status) => ({
    id: draftId, client: doc.client, company: doc.company, clientEmail: doc.clientEmail,
    title: doc.title || "Proposta sem título", value: total, status, date: "Hoje",
    scope: doc.scope, items: doc.items, start: doc.start, end: doc.end,
    payment: doc.payment, revisions: doc.revisions, validity: doc.validity, bio: doc.bio, accent: doc.accent, template: doc.template,
    updatedAt: Date.now(),
  });

  const newProposal = () => { setDoc(BLANK_DOC); setDraftId(newId()); setFlow("editing"); setView("editor"); };
  const openRow = (r) => {
    setDoc({
      ...BLANK_DOC,
      client: r.client || "", company: r.company || "", title: r.title === "Proposta sem título" ? "" : (r.title || ""),
      clientEmail: r.clientEmail || "", scope: r.scope || "",
      items: Array.isArray(r.items) && r.items.length ? r.items : BLANK_DOC.items,
      start: r.start || "", end: r.end || "", payment: r.payment || "",
      revisions: r.revisions || "", validity: r.validity || "", bio: r.bio || "",
      accent: r.accent || "#D97757", logo: null, template: r.template || "minimal",
    });
    setDraftId(r.id || newId());
    setFlow("editing");
    setView("editor");
  };
  const onRowKey = (r) => (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openRow(r); } };

  const navTo = (v) => {
    if (view === "editor" && flow !== "done" && hasContent) setRows(upsertProposal(buildProposal("Rascunho")));
    setFlow("editing");
    setView(v);
  };
  const exitEditor = () => navTo("list");

  const startWithDesign = (id) => {
    setDoc({ ...BLANK_DOC, template: id });
    setDraftId(newId());
    setFlow("editing");
    setView("editor");
  };

  const onLogo = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDoc((d) => ({ ...d, logo: reader.result }));
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const finish = () => { if (canFinish) setFlow("finishing"); };

  const confirmDelete = () => {
    if (toDelete) setRows(removeProposal(toDelete.id));
    setToDelete(null);
  };

  const changeStatus = (r) => (e) => {
    setRows(upsertProposal({ ...r, status: e.target.value }));
  };

  useEffect(() => {
    if (flow !== "finishing") return;
    const rm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const per = rm ? 220 : 720;
    setStep(0);
    setSealing(false);
    let s = 0;
    const id = setInterval(() => {
      s += 1;
      setStep(s);
      if (s >= STEPS.length) {
        clearInterval(id);
        setSealing(true);
        setTimeout(() => setFlow("done"), rm ? 160 : 560);
      }
    }, per);
    return () => clearInterval(id);
  }, [flow]);

  useEffect(() => {
    if (flow === "done") setRows(upsertProposal(buildProposal("Enviada")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow]);

  const count = (f) => (FILTERS[f] ? rows.filter((r) => FILTERS[f].includes(r.status)).length : rows.length);
  const byFilter = FILTERS[filter] ? rows.filter((r) => FILTERS[filter].includes(r.status)) : rows;
  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () => (q ? byFilter.filter((r) => `${r.client || ""} ${r.company || ""} ${r.title || ""}`.toLowerCase().includes(q)) : byFilter),
    [byFilter, q]
  );
  const previewItems = doc.items.filter((it) => it.desc || it.value);

  const labelStyle = { fontSize: 13, fontWeight: 600, color: color.gray700 };
  const sectionLabel = { fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: color.gray400, marginBottom: 10 };
  const pvSection = { fontSize: "11.5px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: color.gray400, marginBottom: 8 };

  const nav = [
    { key: "list", label: "Propostas", Icon: FileText },
    { key: "templates", label: "Templates", Icon: LayoutGrid },
    { key: "clients", label: "Clientes", Icon: Users },
    { key: "settings", label: "Configurações", Icon: Settings },
  ];

  const profileName = user?.name || "Sua conta";
  const profileSub = user ? user.plan : "Não conectado";
  const senderMark = user?.name ? initials(user.name) : "M";
  const missing = [!doc.client.trim() && "Cliente", !doc.title.trim() && "Título"].filter(Boolean);

  return (
    <div className="db" style={{ fontFamily: font.body, color: color.ink, background: color.surface2 }}>
      <style>{`
        .db{ display:flex; min-height:100vh; }
        .db-side{ width:248px; flex:none; background:#fff; border-right:1px solid ${color.line2}; display:flex; flex-direction:column; position:sticky; top:0; height:100vh; }
        .db-main{ flex:1; min-width:0; display:flex; flex-direction:column; }
        .db-pad{ padding:32px 40px; width:100%; max-width:1160px; }

        .db-btn{ font-family:${font.body}; font-weight:600; border:none; cursor:pointer; border-radius:9px; display:inline-flex; align-items:center; justify-content:center; gap:7px; transition:background .15s ease, border-color .15s ease, box-shadow .15s ease, transform .12s ease, opacity .15s ease; }
        .db-btn:active{ transform:translateY(1px); }
        .db-btn:disabled{ opacity:.45; cursor:not-allowed; }
        .db-btn:focus-visible{ outline:2px solid ${color.accent}; outline-offset:2px; }
        .db-btn-accent{ color:#fff; background:${color.accent}; }
        .db-btn-accent:not(:disabled):hover{ background:${color.accentHover}; }
        .db-btn-dark{ color:#fff; background:${color.ink}; }
        .db-btn-dark:not(:disabled):hover{ background:#262626; }
        .db-btn-ghost{ color:${color.ink900}; background:#fff; border:1px solid ${color.gray200}; }
        .db-btn-ghost:not(:disabled):hover{ border-color:${color.ink}; background:${color.surface3}; }
        .db-btn-danger{ color:#fff; background:#B4443C; }
        .db-btn-danger:not(:disabled):hover{ background:#9A3A33; }

        .db-input{ transition:border-color .15s ease, box-shadow .15s ease; }
        .db-input:focus{ border-color:${color.accent}; box-shadow:0 0 0 3px rgba(217,119,87,0.15); }

        .db-new{ width:100%; font-size:14.5px; padding:11px; border-radius:10px; }
        .db-nav a{ display:flex; align-items:center; gap:11px; font-size:14.5px; padding:9px 12px; border-radius:9px; text-decoration:none; transition:background .14s ease, color .14s ease; }
        .db-nav a:focus-visible{ outline:2px solid ${color.accent}; outline-offset:2px; }
        .db-nav a.idle{ color:${color.gray600}; font-weight:500; background:transparent; }
        .db-nav a.idle:hover{ background:${color.surface}; color:${color.ink}; }
        .db-nav a.on{ color:${color.accentInk}; font-weight:600; background:${color.accentTint}; }
        .db-profile{ display:flex; align-items:center; gap:11px; padding:10px 12px; margin:8px; border-radius:11px; }
        .db-logout{ flex:none; margin-left:auto; display:flex; align-items:center; justify-content:center; width:30px; height:30px; border:none; background:none; color:${color.gray400}; border-radius:8px; cursor:pointer; transition:background .14s ease, color .14s ease; }
        .db-logout:hover{ background:${color.surface}; color:${color.ink}; }
        .db-logout:focus-visible{ outline:2px solid ${color.accent}; outline-offset:2px; }

        .db-search{ display:flex; align-items:center; gap:8px; background:#fff; border:1px solid ${color.gray200}; border-radius:10px; padding:0 12px; height:40px; min-width:230px; transition:border-color .15s ease, box-shadow .15s ease; }
        .db-search:focus-within{ border-color:${color.accent}; box-shadow:0 0 0 3px rgba(217,119,87,0.15); }
        .db-search input{ border:none; outline:none; background:transparent; font-family:${font.body}; font-size:14px; width:100%; color:${color.ink}; }
        .db-search input::placeholder{ color:${color.gray400}; }

        .db-tabs{ display:flex; gap:2px; border-bottom:1px solid ${color.line2}; overflow-x:auto; scrollbar-width:none; }
        .db-tabs::-webkit-scrollbar{ display:none; }
        .db-tab{ font-family:${font.body}; font-size:14px; font-weight:600; background:none; border:none; border-bottom:2px solid transparent; padding:11px 12px; margin-bottom:-1px; cursor:pointer; display:inline-flex; align-items:center; gap:8px; white-space:nowrap; color:${color.gray500}; border-radius:8px 8px 0 0; transition:color .14s ease, background .14s ease; }
        .db-tab:hover{ color:${color.ink}; background:${color.surface2}; }
        .db-tab:focus-visible{ outline:2px solid ${color.accent}; outline-offset:-2px; }
        .db-tab.on{ color:${color.ink}; border-bottom-color:${color.accent}; }
        .db-badge{ font-size:11.5px; font-weight:700; padding:1px 8px; border-radius:999px; font-variant-numeric:tabular-nums; }

        .db-table{ background:#fff; border:1px solid ${color.line2}; border-radius:14px; overflow:hidden; }
        .db-thead, .db-row{ display:grid; grid-template-columns:minmax(190px,1.7fr) minmax(150px,1.4fr) 118px 148px 76px 36px; column-gap:22px; align-items:center; }
        .db-thead{ padding:12px 20px; background:${color.surface3}; border-bottom:1px solid #EEE; font-size:11.5px; font-weight:600; letter-spacing:0.04em; text-transform:uppercase; color:${color.gray400}; }
        .db-row{ padding:16px 20px; border-top:1px solid #F3F3F3; cursor:pointer; transition:background .12s ease; }
        .db-row:hover{ background:${color.surface2}; }
        .db-row:focus-visible{ outline:2px solid ${color.accent}; outline-offset:-2px; }
        .db-num{ text-align:right; font-variant-numeric:tabular-nums; }
        .db-c-del{ display:flex; justify-content:flex-end; }
        .db-del{ display:flex; align-items:center; justify-content:center; width:30px; height:30px; border:none; background:none; color:${color.gray400}; border-radius:7px; cursor:pointer; opacity:0; transition:opacity .14s ease, background .14s ease, color .14s ease; }
        .db-row:hover .db-del{ opacity:1; }
        .db-del:hover{ background:#FDECEA; color:#B4443C; }
        .db-del:focus-visible{ opacity:1; outline:2px solid ${color.accent}; outline-offset:1px; }

        .db-footbar{ flex:none; background:#fff; border-top:1px solid ${color.line2}; box-shadow:0 -10px 28px -20px rgba(20,20,30,0.25); display:flex; align-items:center; justify-content:space-between; gap:16px; padding:14px 24px 16px; flex-wrap:wrap; }
        .db-foot-info{ display:flex; align-items:center; gap:16px; }
        .db-foot-label{ font-size:11px; font-weight:600; letter-spacing:.05em; text-transform:uppercase; color:${color.gray400}; margin-bottom:1px; }
        .db-foot-total{ font-family:${font.heading}; font-weight:900; font-size:22px; letter-spacing:-0.02em; font-variant-numeric:tabular-nums; }
        .db-foot-div{ width:1px; height:30px; background:${color.line2}; }
        .db-foot-items{ font-size:13px; color:${color.gray500}; }
        .db-foot-actions{ display:flex; align-items:center; gap:14px; }
        .db-ready{ display:flex; align-items:center; gap:7px; font-size:12.5px; color:${color.gray400}; }
        .db-ready.ok{ color:#2E7D51; font-weight:600; }
        .db-chip{ font-size:11px; font-weight:600; color:${color.gray600}; background:${color.surface}; border:1px solid ${color.gray200}; padding:2px 8px; border-radius:999px; }
        .db-dsn-grid{ display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:22px; }
        .db-dsn-card{ border:1px solid ${color.line2}; border-radius:14px; overflow:hidden; background:#fff; transition:box-shadow .16s ease, transform .16s ease; }
        .db-dsn-card:hover{ box-shadow:0 16px 38px -20px rgba(20,20,30,0.28); transform:translateY(-3px); }
        .db-dsn-thumb{ position:relative; height:300px; overflow:hidden; background:${color.surface2}; border-bottom:1px solid ${color.line2}; }
        .db-swatch{ width:24px; height:24px; border:none; border-radius:50%; cursor:pointer; padding:0; transition:transform .12s ease; }
        .db-swatch:hover{ transform:scale(1.12); }
        .db-swatch:focus-visible{ outline:2px solid ${color.ink}; outline-offset:2px; }
        .db-status-sel{ font-family:${font.body}; font-size:11.5px; font-weight:600; padding:3px 10px; border-radius:999px; cursor:pointer; outline:none; -webkit-appearance:none; appearance:none; max-width:100%; }
        .db-status-sel:focus-visible{ outline:2px solid ${color.accent}; outline-offset:1px; }
        .db-kpi-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:26px; }
        .db-cli-wrap{ overflow-x:auto; background:#fff; border:1px solid ${color.line2}; border-radius:14px; }
        .db-cli-head, .db-cli-row{ display:grid; grid-template-columns:minmax(200px,2fr) 110px 90px 90px 130px; column-gap:16px; align-items:center; padding:14px 20px; }
        .db-cli-head{ background:${color.surface3}; border-bottom:1px solid #EEE; font-size:11.5px; font-weight:600; letter-spacing:0.04em; text-transform:uppercase; color:${color.gray400}; }
        .db-cli-row{ border-top:1px solid #F3F3F3; }
        @media (max-width:900px){ .db-kpi-grid{ grid-template-columns:repeat(2,1fr); } }
        @media (max-width:520px){ .db-kpi-grid{ grid-template-columns:1fr; } }
        @media (max-width:680px){ .db-dsn-grid{ grid-template-columns:1fr; } }

        .db-flow{ position:fixed; inset:0; z-index:120; background:rgba(249,250,251,0.85); backdrop-filter:blur(5px); display:flex; align-items:center; justify-content:center; padding:24px; animation:dbFade .2s ease both; }
        .db-flow-card{ width:100%; max-width:440px; background:#fff; border:1px solid ${color.line}; border-radius:18px; box-shadow:0 30px 70px -22px rgba(20,20,30,0.35); padding:32px 30px; animation:dbPop .38s cubic-bezier(.2,.8,.2,1) both; }
        @keyframes dbFade{ from{ opacity:0; } to{ opacity:1; } }
        @keyframes dbPop{ 0%{ opacity:0; transform:translateY(12px) scale(.96); } 100%{ opacity:1; transform:none; } }
        .db-step{ display:flex; align-items:center; gap:12px; padding:10px 0; animation:dbStepIn .4s cubic-bezier(.2,.8,.2,1) both; }
        @keyframes dbStepIn{ from{ opacity:0; transform:translateY(9px); } to{ opacity:1; transform:none; } }
        .db-spin{ width:20px; height:20px; flex:none; border:2px solid ${color.accentTint}; border-top-color:${color.accent}; border-radius:50%; animation:dbSpin .7s linear infinite; }
        @keyframes dbSpin{ to{ transform:rotate(360deg); } }
        .db-tick{ width:20px; height:20px; flex:none; border-radius:50%; background:#EAF5EE; color:#2E7D51; display:flex; align-items:center; justify-content:center; animation:dbPop .3s ease both; }
        .db-check-ring{ stroke-dasharray:151; stroke-dashoffset:151; animation:dbDraw .5s ease forwards; }
        .db-check-tick{ stroke-dasharray:40; stroke-dashoffset:40; animation:dbDraw .4s .45s ease forwards; }
        @keyframes dbDraw{ to{ stroke-dashoffset:0; } }
        @keyframes dbUp{ from{ opacity:0; transform:translateY(10px); } to{ opacity:1; transform:none; } }
        @keyframes dbStepsOut{ from{ opacity:1; transform:none; } to{ opacity:0; transform:translateY(-8px) scale(.98); } }
        .db-steps-out{ animation:dbStepsOut .42s cubic-bezier(.4,0,.2,1) both; }
        .db-in-0{ animation:dbUp .5s ease both; }
        .db-in-1{ animation:dbUp .5s .12s both; }
        .db-in-2{ animation:dbUp .5s .24s both; }
        .db-in-3{ animation:dbUp .55s .38s both; }
        .db-intro{ position:fixed; inset:0; z-index:300; background:radial-gradient(120% 100% at 30% 10%,#2A1712 0%,#0A0A0A 62%); display:flex; align-items:center; justify-content:center; animation:dbIntroOut .6s .15s cubic-bezier(.4,0,.2,1) forwards; }
        .db-intro-mark{ width:64px; height:64px; border-radius:16px; background:#fff; color:#0A0A0A; display:flex; align-items:center; justify-content:center; font-family:${font.heading}; font-weight:900; font-size:34px; animation:dbIntroMark .55s ease forwards; }
        @keyframes dbIntroOut{ to{ opacity:0; visibility:hidden; } }
        @keyframes dbIntroMark{ 0%{ transform:scale(1); opacity:1; } 100%{ transform:scale(1.18); opacity:0; } }

        @media (max-width:980px){
          .db-side{ width:70px; }
          .db-collapsed{ display:none !important; }
          .db-new{ padding:11px 0; }
          .db-nav a{ justify-content:center; padding:11px 0; }
          .db-profile{ justify-content:center; }
        }
        @media (max-width:820px){
          .db-split{ grid-template-columns:1fr !important; }
          .db-preview{ display:none !important; }
        }
        @media (max-width:680px){
          .db-pad{ padding:20px 16px; }
          .db-thead{ display:none; }
          .db-row{ grid-template-columns:1fr auto; grid-template-areas:"client del" "title value" "status date"; row-gap:8px; column-gap:12px; padding:16px; }
          .db-c-client{ grid-area:client; } .db-c-title{ grid-area:title; } .db-c-value{ grid-area:value; }
          .db-c-status{ grid-area:status; } .db-c-date{ grid-area:date; } .db-c-del{ grid-area:del; justify-self:end; }
          .db-c-value, .db-c-date{ justify-self:end; text-align:right; }
          .db-del{ opacity:1; }
        }
        @media (prefers-reduced-motion: reduce){
          .db *, .db *::before, .db *::after{ transition-duration:.001ms !important; animation-duration:.001ms !important; }
          .db-spin{ animation:none !important; }
        }
      `}</style>

      {/* SIDEBAR */}
      <aside className="db-side">
        <div style={{ padding: "20px 16px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 6px", marginBottom: 18, height: 28 }}>
            <span style={{ width: 28, height: 28, flex: "none", borderRadius: 8, background: color.ink, color: color.white, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.heading, fontWeight: 900, fontSize: 16 }}>M</span>
            <span className="db-collapsed" style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em" }}>Manda</span>
          </div>
          <button onClick={newProposal} className="db-btn db-btn-accent db-new">
            <Plus size={17} strokeWidth={2.4} /><span className="db-collapsed">Nova proposta</span>
          </button>
        </div>
        <nav className="db-nav" style={{ flex: 1, padding: "6px 12px", display: "flex", flexDirection: "column", gap: 3 }}>
          {nav.map((n) => {
            const on = (n.key === "list" && (view === "list" || view === "editor")) || (n.key === "templates" && view === "templates") || (n.key === "clients" && view === "clients");
            return (
              <a key={n.key} href="#" className={on ? "on" : "idle"} title={n.label} aria-current={on ? "page" : undefined}
                onClick={(e) => { e.preventDefault(); if (n.key === "list") navTo("list"); else if (n.key === "templates") navTo("templates"); else if (n.key === "clients") navTo("clients"); }}>
                <span style={{ display: "flex", flex: "none" }}><n.Icon size={18} strokeWidth={1.9} /></span>
                <span className="db-collapsed">{n.label}</span>
              </a>
            );
          })}
        </nav>
        <div style={{ borderTop: `1px solid ${color.line2}` }}>
          <div className="db-profile" title={profileName}>
            <span style={{ width: 34, height: 34, flex: "none", borderRadius: "50%", background: color.accentTint, color: color.accentInk, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.heading, fontWeight: 700, fontSize: 14 }}>
              {user ? initials(user.name) : <User size={17} strokeWidth={2} />}
            </span>
            <div className="db-collapsed" style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "13.5px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profileName}</div>
              <div style={{ fontSize: 12, color: color.gray400 }}>{profileSub}</div>
            </div>
            <button onClick={() => go && go("landing")} className="db-collapsed db-logout" aria-label="Sair" title="Sair"><LogOut size={17} strokeWidth={1.9} /></button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="db-main">
        {view === "list" ? (
          <div className="db-pad">
            <div className="db-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
              <div>
                <h1 style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 27, letterSpacing: "-0.02em", margin: "0 0 4px" }}>Suas propostas</h1>
                <p style={{ fontSize: "14.5px", color: color.gray500, margin: 0 }}>Acompanhe o status de cada proposta num lugar só.</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <label className="db-search">
                  <Search size={16} strokeWidth={2} color={color.gray400} />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por cliente ou proposta" aria-label="Buscar propostas" />
                </label>
                <button onClick={newProposal} className="db-btn db-btn-dark" style={{ fontSize: 14, padding: "10px 16px", flex: "none" }}>
                  <Plus size={16} strokeWidth={2.4} />Nova proposta
                </button>
              </div>
            </div>

            <div className="db-tabs" style={{ marginBottom: 18 }}>
              {Object.keys(FILTERS).map((f) => {
                const on = filter === f;
                return (
                  <button key={f} onClick={() => setFilter(f)} className={`db-tab${on ? " on" : ""}`}>
                    {f}
                    <span className="db-badge" style={{ color: on ? color.accentInk : color.gray500, background: on ? color.accentTint : color.surface }}>{count(f)}</span>
                  </button>
                );
              })}
            </div>

            {visible.length > 0 ? (
              <div className="db-table">
                <div className="db-thead">
                  <span>Cliente</span><span>Proposta</span><span className="db-num">Valor</span><span>Status</span><span className="db-num">Data</span><span />
                </div>
                {visible.map((r, i) => {
                  const av = avatarPalette[i % 4];
                  const sc = statusColors[r.status] || statusColors.Rascunho;
                  return (
                    <div key={r.id || i} className="db-row" role="button" tabIndex={0} onClick={() => openRow(r)} onKeyDown={onRowKey(r)} aria-label={`Abrir proposta de ${r.client || "cliente"}`}>
                      <div className="db-c-client" style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                        <span style={{ width: 34, height: 34, flex: "none", borderRadius: 9, background: av.bg, color: av.ink, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.heading, fontWeight: 700, fontSize: "12.5px" }}>{initials(r.client || "")}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.client || "Sem cliente"}</div>
                          <div style={{ fontSize: "12.5px", color: color.gray400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.company || "—"}</div>
                        </div>
                      </div>
                      <span className="db-c-title" style={{ fontSize: 14, color: color.gray700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: 12 }}>{r.title || "Proposta sem título"}</span>
                      <span className="db-c-value db-num" style={{ fontSize: 14, fontWeight: 600, color: r.value ? color.ink : color.gray400 }}>{r.value ? brl(r.value) : "—"}</span>
                      <span className="db-c-status">
                        <select value={r.status || "Rascunho"} onClick={(e) => e.stopPropagation()} onChange={changeStatus(r)} aria-label="Mudar status" className="db-status-sel" style={{ color: sc.c, background: sc.bg, border: `1px solid ${sc.b}` }}>
                          {STATUS_OPTIONS.map((st) => <option key={st} value={st} style={{ color: color.ink, background: "#fff" }}>{st}</option>)}
                        </select>
                      </span>
                      <span className="db-c-date db-num" style={{ fontSize: 13, color: color.gray400 }}>{r.date || ""}</span>
                      <span className="db-c-del">
                        <button className="db-del" onClick={(e) => { e.stopPropagation(); setToDelete(r); }} aria-label={`Excluir proposta de ${r.client || "cliente"}`} title="Excluir">
                          <Trash2 size={16} strokeWidth={2} />
                        </button>
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : rows.length === 0 ? (
              <EmptyState onNew={newProposal} />
            ) : (
              <NoResults onClear={() => { setQuery(""); setFilter("Todas"); }} />
            )}
          </div>
        ) : view === "templates" ? (
          <DesignGallery onUse={startWithDesign} />
        ) : view === "clients" ? (
          <ClientsPanel rows={rows} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
            {/* action bar */}
            <div style={{ flex: "none", minHeight: 60, background: color.white, borderBottom: `1px solid ${color.line2}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 20px", flexWrap: "wrap" }}>
              <button onClick={exitEditor} className="db-btn" style={{ fontSize: 14, fontWeight: 500, color: color.gray600, background: "none", padding: "6px 8px" }}>
                <ArrowLeft size={17} strokeWidth={2.2} />Propostas
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: color.gray400, marginRight: 6, display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: hasContent ? "#22C55E" : color.gray300 }} />{hasContent ? "Rascunho salvo ao sair" : "Rascunho"}</span>
                <button className="db-btn db-btn-ghost" style={{ fontSize: 14, padding: "9px 15px" }}>Pré-visualizar</button>
              </div>
            </div>

            {/* split */}
            <div className="db-split" style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 0 }}>
              {/* editor side */}
              <div style={{ overflow: "auto", padding: "32px 36px", borderRight: `1px solid ${color.line2}` }}>
                <div style={{ maxWidth: 440, margin: "0 auto", display: "flex", flexDirection: "column", gap: 26 }}>
                  <div>
                    <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 20, letterSpacing: "-0.01em", marginBottom: 4 }}>Monte sua proposta</div>
                    <div style={{ fontSize: "13.5px", color: color.gray500 }}>Preencha os campos e veja a proposta tomando forma à direita.</div>
                  </div>

                  <div>
                    <div style={sectionLabel}>Modelo da proposta</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {DESIGNS.map((d) => {
                        const on = (doc.template || "minimal") === d.id;
                        return (
                          <button key={d.id} onClick={() => setDoc((cur) => ({ ...cur, template: d.id }))} className="db-btn"
                            style={{ fontSize: "13px", fontWeight: 600, padding: "8px 13px", borderRadius: 9, border: `1px solid ${on ? color.ink : color.gray200}`, background: on ? color.ink : "#fff", color: on ? "#fff" : color.ink900 }}>
                            {d.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                    <div>
                      <div style={sectionLabel}>Logo</div>
                      <label className="db-btn" style={{ display: "flex", alignItems: "center", gap: 12, background: "none", border: "1px dashed #DDD", borderRadius: 11, padding: 12, width: "fit-content", cursor: "pointer" }}>
                        <input type="file" accept="image/*" onChange={onLogo} style={{ display: "none" }} />
                        {doc.logo
                          ? <img src={doc.logo} alt="" style={{ width: 40, height: 40, borderRadius: 9, objectFit: "cover", display: "block" }} />
                          : <span style={{ width: 40, height: 40, borderRadius: 9, background: color.surface, color: color.gray400, display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={20} strokeWidth={1.9} /></span>}
                        <span style={{ fontSize: "13.5px", fontWeight: 500, color: color.gray500 }}>{doc.logo ? "Trocar logo" : "Enviar sua logo"}</span>
                      </label>
                      {doc.logo && <button onClick={() => setDoc((d) => ({ ...d, logo: null }))} className="db-btn" style={{ marginTop: 8, fontSize: "12.5px", color: color.gray500, background: "none", padding: "2px 4px", gap: 5 }}><X size={13} strokeWidth={2.2} />Remover</button>}
                    </div>
                    <div>
                      <div style={sectionLabel}>Cor</div>
                      <div style={{ display: "flex", gap: 9, paddingTop: 4 }}>
                        {SWATCHES.map((c) => (
                          <button key={c} className="db-swatch" onClick={() => setDoc((d) => ({ ...d, accent: c }))} aria-label={`Cor ${c}`} title="Cor da proposta"
                            style={{ background: c, boxShadow: doc.accent === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : `0 0 0 1px ${color.line}` }} />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <Field label="Cliente" required><input className="db-input" value={doc.client} onChange={updDoc("client")} placeholder="Nome do cliente" style={inp()} /></Field>
                    <Field label="Empresa"><input className="db-input" value={doc.company} onChange={updDoc("company")} placeholder="Empresa" style={inp()} /></Field>
                  </div>
                  <Field label="Título da proposta" required><input className="db-input" value={doc.title} onChange={updDoc("title")} placeholder="Ex: Produção de vídeo institucional" style={inp()} /></Field>

                  <div>
                    <div style={sectionLabel}>Escopo</div>
                    <textarea className="db-input" value={doc.scope} onChange={updDoc("scope")} rows={4} placeholder="Descreva o que está incluído no serviço." style={{ ...inp(), resize: "vertical", lineHeight: 1.5 }} />
                  </div>

                  <div>
                    <div style={sectionLabel}>Investimento</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {doc.items.map((it, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input className="db-input" value={it.desc} onChange={updItem(i, "desc")} placeholder="Item" style={{ ...inp(), flex: 1 }} />
                          <div className="db-input" style={{ display: "flex", alignItems: "center", gap: 4, flex: "none", width: 118, border: `1px solid ${color.gray200}`, borderRadius: 9, padding: "0 10px", background: color.white }}>
                            <span style={{ fontSize: 13, color: color.gray400 }}>R$</span>
                            <input value={it.value} onChange={updItem(i, "value")} inputMode="numeric" placeholder="0" style={{ width: "100%", border: "none", outline: "none", fontFamily: font.body, fontSize: 14, padding: "10px 0", background: "transparent" }} />
                          </div>
                          <button onClick={removeItem(i)} className="db-btn" aria-label="Remover item" style={{ flex: "none", width: 34, height: 38, border: "1px solid #EEE", background: color.white, borderRadius: 9, color: color.gray400 }}><Trash2 size={15} strokeWidth={2} /></button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                      <button onClick={addItem} disabled={doc.items.length >= MAX_ITEMS} className="db-btn" style={{ fontSize: "13.5px", color: color.accent, background: "none", padding: "4px 2px" }}>
                        <Plus size={15} strokeWidth={2.4} />Adicionar item
                      </button>
                      {doc.items.length >= MAX_ITEMS && <span style={{ fontSize: "12.5px", color: color.gray400 }}>Limite de {MAX_ITEMS} itens.</span>}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <Field label="Início"><input className="db-input" value={doc.start} onChange={updDoc("start")} placeholder="Ex: 10 de agosto" style={inp()} /></Field>
                    <Field label="Entrega"><input className="db-input" value={doc.end} onChange={updDoc("end")} placeholder="Ex: 5 de setembro" style={inp()} /></Field>
                  </div>

                  <div>
                    <div style={sectionLabel}>Condições</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <Field label="Forma de pagamento"><input className="db-input" value={doc.payment} onChange={updDoc("payment")} placeholder="Ex: 50% na aprovação, 50% na entrega" style={inp()} /></Field>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                        <Field label="Revisões inclusas"><input className="db-input" value={doc.revisions} onChange={updDoc("revisions")} placeholder="Ex: 2 rodadas" style={inp()} /></Field>
                        <Field label="Validade"><input className="db-input" value={doc.validity} onChange={updDoc("validity")} placeholder="Ex: 15 dias" style={inp()} /></Field>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div style={sectionLabel}>Sobre mim</div>
                    <textarea className="db-input" value={doc.bio} onChange={updDoc("bio")} rows={3} placeholder="Uma breve apresentação sua." style={{ ...inp(), resize: "vertical", lineHeight: 1.5 }} />
                    <div style={{ fontSize: "12.5px", color: color.gray400, marginTop: 6 }}>Salvo para a próxima proposta automaticamente.</div>
                  </div>
                </div>
              </div>

              {/* preview side */}
              <div className="db-preview" style={{ overflow: "auto", background: color.surface, padding: "32px 36px" }}>
                <ProposalDesign id={doc.template} doc={doc} accent={doc.accent} />
              </div>
            </div>

            {/* barra inferior */}
            <div className="db-footbar">
              <div className="db-foot-info">
                <div>
                  <div className="db-foot-label">Total da proposta</div>
                  <div className="db-foot-total">{brl(total)}</div>
                </div>
                <span className="db-foot-div" />
                <span className="db-foot-items">{itemCount} {itemCount === 1 ? "item" : "itens"}</span>
              </div>
              <div className="db-foot-actions">
                {canFinish ? (
                  <span className="db-ready ok"><Check size={15} strokeWidth={2.6} />Tudo pronto</span>
                ) : (
                  <span className="db-ready">Falta {missing.map((m) => <span key={m} className="db-chip">{m}</span>)}</span>
                )}
                <button onClick={finish} disabled={!canFinish} className="db-btn db-btn-accent" style={{ fontSize: 15, padding: "12px 24px", borderRadius: 10 }}>
                  <Check size={17} strokeWidth={2.6} />Concluir proposta
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FLOW DE CONCLUSÃO */}
      {view === "editor" && flow !== "editing" && (
        <div className="db-flow">
          <div className="db-flow-card">
            {flow === "finishing" ? (
              <div>
                <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 20, letterSpacing: "-0.01em", marginBottom: 4 }}>Finalizando sua proposta</div>
                <div style={{ fontSize: 14, color: color.gray500, marginBottom: 12 }}>Só um instante, deixando tudo com cara de profissional.</div>
                <div className={sealing ? "db-steps db-steps-out" : "db-steps"}>
                  {STEPS.map((label, i) => (i <= step ? (
                    <div key={i} className="db-step">
                      {i < step
                        ? <span className="db-tick"><Check size={13} strokeWidth={3} /></span>
                        : <span className="db-spin" />}
                      <span style={{ fontSize: 14.5, fontWeight: i === step ? 600 : 500, color: i < step ? color.gray500 : color.ink }}>{label}</span>
                    </div>
                  ) : null))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center" }}>
                <div className="db-in-0" style={{ width: 76, height: 76, margin: "0 auto 20px" }}>
                  <svg width="76" height="76" viewBox="0 0 52 52" aria-hidden="true">
                    <circle cx="26" cy="26" r="24" fill="none" stroke={color.accent} strokeWidth="3" className="db-check-ring" />
                    <path d="M15 27 l7 7 l15 -16" fill="none" stroke={color.accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="db-check-tick" />
                  </svg>
                </div>
                <div className="db-in-1" style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 22, letterSpacing: "-0.01em" }}>Proposta pronta!</div>
                <div className="db-in-2" style={{ fontSize: 14, color: color.gray500, margin: "6px 0 24px" }}>Agora é só compartilhar com {doc.client || "seu cliente"}.</div>

                <div className="db-in-3" style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <div style={{ ...labelStyle, marginBottom: 7 }}>Link da proposta</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, padding: "0 12px", border: `1px solid ${color.gray200}`, borderRadius: 10, background: color.surface3, fontSize: "13.5px", color: color.gray600, height: 42 }}>
                        <Link2 size={15} color={color.gray400} />
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{shareUrl()}</span>
                      </div>
                      <button onClick={copyLink} className="db-btn" style={{ flex: "none", fontSize: 14, padding: "0 16px", height: 42, borderRadius: 10, color: copied ? color.white : color.ink900, background: copied ? "#22C55E" : color.white, border: `1px solid ${copied ? "#22C55E" : color.gray200}` }}>{copied ? "Copiado!" : "Copiar"}</button>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "2px 0" }}>
                    <span style={{ flex: 1, height: 1, background: "#EEE" }} /><span style={{ fontSize: "12.5px", color: color.gray400 }}>ou envie por email</span><span style={{ flex: 1, height: 1, background: "#EEE" }} />
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <input className="db-input" type="email" value={doc.clientEmail} onChange={updDoc("clientEmail")} placeholder="cliente@email.com" autoComplete="email" style={{ ...inp(), flex: 1, height: 42 }} />
                    <button onClick={sendByEmail} className="db-btn db-btn-dark" style={{ flex: "none", fontSize: 14, padding: "0 16px", height: 42, borderRadius: 10 }}><Mail size={16} strokeWidth={2.2} />Enviar</button>
                  </div>
                </div>

                <div className="db-in-3" style={{ display: "flex", gap: 10, marginTop: 24 }}>
                  <button onClick={() => setFlow("editing")} className="db-btn db-btn-ghost" style={{ flex: 1, fontSize: 14, padding: "11px 0" }}><Pencil size={15} strokeWidth={2.2} />Editar</button>
                  <button onClick={() => { setView("list"); setFlow("editing"); }} className="db-btn db-btn-ghost" style={{ flex: 1, fontSize: 14, padding: "11px 0" }}>Ir para propostas</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
      {toDelete && (
        <div className="db-flow" onClick={() => setToDelete(null)}>
          <div className="db-flow-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{ maxWidth: 400, textAlign: "center" }}>
            <div style={{ width: 52, height: 52, margin: "0 auto 16px", borderRadius: 14, background: "#FDECEA", color: "#B4443C", display: "flex", alignItems: "center", justifyContent: "center" }}><AlertTriangle size={24} strokeWidth={2} /></div>
            <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 20, letterSpacing: "-0.01em" }}>Excluir esta proposta?</div>
            <p style={{ fontSize: 14.5, color: color.gray500, margin: "8px 0 22px" }}>
              A proposta de <strong style={{ color: color.ink }}>{toDelete.client || "cliente"}</strong>{toDelete.title && toDelete.title !== "Proposta sem título" ? <> ({toDelete.title})</> : null} será removida. Essa ação não pode ser desfeita.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setToDelete(null)} className="db-btn db-btn-ghost" style={{ flex: 1, fontSize: 14.5, padding: "11px 0" }}>Cancelar</button>
              <button onClick={confirmDelete} className="db-btn db-btn-danger" style={{ flex: 1, fontSize: 14.5, padding: "11px 0" }}><Trash2 size={16} strokeWidth={2.2} />Excluir</button>
            </div>
          </div>
        </div>
      )}

      {intro && (
        <div className="db-intro" aria-hidden="true">
          <div className="db-intro-mark">M</div>
        </div>
      )}
    </div>
  );
}

function inp() {
  return { fontFamily: font.body, fontSize: 14, padding: "10px 12px", border: `1px solid ${color.gray200}`, borderRadius: 9, outline: "none", background: color.white, width: "100%" };
}

function Field({ label, required, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: color.gray700 }}>
        {label}{required && <span style={{ color: color.accent, marginLeft: 3 }}>*</span>}
      </span>
      {children}
    </label>
  );
}

function EmptyState({ onNew }) {
  return (
    <div style={{ background: color.white, border: "1px dashed #DDD", borderRadius: 16, padding: "64px 24px", textAlign: "center" }}>
      <div style={{ width: 64, height: 64, margin: "0 auto 20px", borderRadius: 16, background: color.accentTint, color: color.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><FileText size={30} strokeWidth={1.8} /></div>
      <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Nada por aqui ainda</div>
      <p style={{ fontSize: 15, color: color.gray500, margin: "0 0 22px" }}>Crie sua primeira proposta em 2 minutos. Escolha um template e o resto flui.</p>
      <button onClick={onNew} className="db-btn db-btn-accent" style={{ fontSize: "14.5px", padding: "12px 22px", borderRadius: 10 }}>Criar primeira proposta</button>
    </div>
  );
}

function NoResults({ onClear }) {
  return (
    <div style={{ background: color.white, border: `1px solid ${color.line2}`, borderRadius: 16, padding: "56px 24px", textAlign: "center" }}>
      <div style={{ width: 56, height: 56, margin: "0 auto 18px", borderRadius: 14, background: color.surface, color: color.gray400, display: "flex", alignItems: "center", justifyContent: "center" }}><Search size={26} strokeWidth={1.9} /></div>
      <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 19, marginBottom: 6 }}>Nada encontrado</div>
      <p style={{ fontSize: 14.5, color: color.gray500, margin: "0 0 20px" }}>Nenhuma proposta corresponde à sua busca ou filtro.</p>
      <button onClick={onClear} className="db-btn db-btn-ghost" style={{ fontSize: 14, padding: "10px 18px" }}>Limpar busca e filtros</button>
    </div>
  );
}

function DesignGallery({ onUse }) {
  return (
    <div className="db-pad">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 27, letterSpacing: "-0.02em", margin: "0 0 4px" }}>Modelos de proposta</h1>
        <p style={{ fontSize: "14.5px", color: color.gray500, margin: 0 }}>Cada modelo é um design diferente. Escolha um e personalize a cor, a logo e os textos depois.</p>
      </div>
      <div className="db-dsn-grid">
        {DESIGNS.map((d) => (
          <div key={d.id} className="db-dsn-card">
            <div className="db-dsn-thumb">
              <div style={{ position: "absolute", top: 0, left: "50%", width: 460, transform: "translateX(-50%) scale(0.62)", transformOrigin: "top center", pointerEvents: "none" }}>
                <ProposalDesign id={d.id} doc={SAMPLE_DOC} accent={d.accent} />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px" }}>
              <div>
                <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 15 }}>{d.name}</div>
                <div style={{ fontSize: 12, color: color.gray400 }}>{d.tag}</div>
              </div>
              <button onClick={() => onUse(d.id)} className="db-btn db-btn-dark" style={{ fontSize: "13.5px", padding: "9px 16px" }}>Usar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClientsPanel({ rows }) {
  const OPENED = ["Visualizada", "Aceita", "Recusada"];
  const num = (v) => Number(v) || 0;
  const receita = rows.filter((r) => r.status === "Aceita").reduce((a, r) => a + num(r.value), 0);
  const emAberto = rows.filter((r) => r.status === "Enviada" || r.status === "Visualizada").reduce((a, r) => a + num(r.value), 0);
  const enviadas = rows.filter((r) => r.status && r.status !== "Rascunho").length;
  const aceitas = rows.filter((r) => r.status === "Aceita").length;
  const conv = enviadas ? Math.round((aceitas / enviadas) * 100) : 0;

  const map = {};
  rows.forEach((r) => {
    const key = (r.client || "Sem cliente").trim() || "Sem cliente";
    if (!map[key]) map[key] = { client: key, company: "", count: 0, value: 0, accepted: 0, opened: false };
    const g = map[key];
    g.count += 1;
    g.value += num(r.value);
    if (OPENED.includes(r.status)) g.opened = true;
    if (r.status === "Aceita") g.accepted += 1;
    if (!g.company && r.company) g.company = r.company;
  });
  const clients = Object.values(map).sort((a, b) => b.value - a.value);

  const Kpi = ({ label, value, tint }) => (
    <div style={{ background: "#fff", border: `1px solid ${color.line2}`, borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: color.gray400, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 26, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: tint || color.ink }}>{value}</div>
    </div>
  );
  const YesNo = ({ on }) => on
    ? <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: "#EAF5EE", color: "#2E7D51" }}><Check size={13} strokeWidth={3} /></span>
    : <span style={{ color: color.gray300, fontSize: 15 }}>—</span>;

  return (
    <div className="db-pad">
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 27, letterSpacing: "-0.02em", margin: "0 0 4px" }}>Clientes</h1>
        <p style={{ fontSize: "14.5px", color: color.gray500, margin: 0 }}>Acompanhe suas propostas por cliente e a receita do período.</p>
      </div>

      <div className="db-kpi-grid">
        <Kpi label="Receita do mês" value={brl(receita)} tint="#2E7D51" />
        <Kpi label="Em aberto" value={brl(emAberto)} />
        <Kpi label="Propostas enviadas" value={enviadas} />
        <Kpi label="Conversão" value={`${conv}%`} />
      </div>

      {clients.length ? (
        <div className="db-cli-wrap">
          <div className="db-cli-head">
            <span>Cliente</span><span>Propostas</span><span>Abriu</span><span>Aceitou</span><span style={{ textAlign: "right" }}>Valor total</span>
          </div>
          {clients.map((c, i) => (
            <div key={i} className="db-cli-row">
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <span style={{ width: 34, height: 34, flex: "none", borderRadius: 9, background: avatarPalette[i % 4].bg, color: avatarPalette[i % 4].ink, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.heading, fontWeight: 700, fontSize: "12.5px" }}>{initials(c.client)}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.client}</div>
                  <div style={{ fontSize: "12.5px", color: color.gray400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.company || "—"}</div>
                </div>
              </div>
              <span style={{ fontSize: 14, color: color.gray700, fontVariantNumeric: "tabular-nums" }}>{c.count}</span>
              <span><YesNo on={c.opened} /></span>
              <span>{c.accepted ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "11.5px", fontWeight: 600, color: "#2E7D51" }}><Check size={13} strokeWidth={3} />{c.accepted}</span> : <YesNo on={false} />}</span>
              <span style={{ fontSize: 14, fontWeight: 600, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{brl(c.value)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px dashed #DDD", borderRadius: 16, padding: "56px 24px", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, margin: "0 auto 18px", borderRadius: 14, background: color.accentTint, color: color.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><Users size={26} strokeWidth={1.9} /></div>
          <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 19, marginBottom: 6 }}>Nenhum cliente ainda</div>
          <p style={{ fontSize: 14.5, color: color.gray500, margin: 0 }}>Crie e envie propostas para ver seus clientes e a receita aqui.</p>
        </div>
      )}
    </div>
  );
}
