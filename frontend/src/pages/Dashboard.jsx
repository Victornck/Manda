import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, FileText, LayoutGrid, Users, Settings, ArrowLeft, Image as ImageIcon,
  Trash2, Search, LogOut, User, Link2, Mail, Pencil, Check, AlertTriangle, X,
  Bell, Eye, Clock, Lock, Calendar, RotateCcw,
} from "lucide-react";
import { font, color, statusColors, avatarPalette, brl, initials } from "../theme.js";
import { api, setToken } from "../lib/api.js";
import { loadProposals, upsertProposal, removeProposal, newId } from "../lib/drafts.js";
import { loadNotifs, mergeNotifs, getSeen, setSeen } from "../lib/notifs.js";
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
  accent: "#0A0A0A", accent2: "#6C48B0", gradient: false, logo: null, cover: null, template: "minimal",
};

const MAX_ITEMS = 20;
const STATUS_OPTIONS = ["Rascunho", "Enviada", "Visualizada", "Aceita", "Recusada"];

// Cores de atalho — o usuário também pode escolher QUALQUER cor no seletor.
const PRESET_COLORS = ["#D97757", "#3A5BB5", "#2E7D51", "#6C48B0", "#0A0A0A", "#C6407E", "#E0A100"];

// Limites de caracteres por campo (sempre <= aos do backend, para não falhar no salvamento).
const LIMITS = {
  client: 80, company: 80, title: 120, scope: 5000, itemDesc: 120, itemValue: 12,
  start: 60, end: 60, payment: 300, revisions: 120, validity: 60, bio: 600,
};

// Chaves do localStorage escopadas por usuário (evita vazar entre contas no mesmo navegador).
const ONB_KEY = "manda_onboarding";
const scoped = (base, email) => `${base}:${email || "anon"}`;
function loadOnb(email) { try { return JSON.parse(localStorage.getItem(scoped(ONB_KEY, email)) || "{}") || {}; } catch { return {}; } }
function saveOnb(email, o) { try { localStorage.setItem(scoped(ONB_KEY, email), JSON.stringify(o)); } catch { /* ignore */ } }
const bioKeyFor = (email) => scoped("manda_default_bio", email);

// Comprime/redimensiona a imagem no navegador antes de salvar: logo pequena (PNG,
// mantém transparência) e capa leve (JPEG). Mantém o armazenamento enxuto.
function compressImage(file, key) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const isLogo = key === "logo";
      const scale = Math.min(1, (isLogo ? 320 : 1600) / img.width, (isLogo ? 320 : 900) / img.height);
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(isLogo ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("imagem inválida")); };
    img.src = url;
  });
}

// Status: o backend fala inglês, a UI fala português.
const EN2PT = { draft: "Rascunho", sent: "Enviada", viewed: "Visualizada", accepted: "Aceita", declined: "Recusada" };
const PT2EN = { Rascunho: "draft", Enviada: "sent", Visualizada: "viewed", Aceita: "accepted", Recusada: "declined" };
// Cota mensal de propostas por plano (espelha o backend). Business é ilimitado.
const PLAN_QUOTA = { free: 0, basic: 5, pro: 25, business: Infinity };
// Rascunhos ficam locais (localStorage) e têm id começando com "d_".
// Propostas concluídas vivem no servidor e têm id UUID.
const isLocalId = (id) => String(id || "").startsWith("d_");
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  if (d.toDateString() === new Date().toDateString()) return "Hoje";
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
// Notificações: rótulo e verbo por tipo de evento.
const NOTIF_VERB = { viewed: "visualizou", accepted: "aceitou", declined: "recusou" };
const notifLabel = (n) => `${(n.client || "Alguém").trim() || "Alguém"} ${NOTIF_VERB[n.type] || "interagiu com"} "${n.title || "sua proposta"}"`;
function timeAgo(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "agora";
  const m = Math.floor(s / 60); if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60); if (h < 24) return `há ${h} h`;
  const dd = Math.floor(h / 24); if (dd < 30) return `há ${dd} d`;
  return fmtDate(iso);
}

// Converte uma proposta da API para o formato de linha da tabela (status em PT).
const fromApi = (p) => ({
  id: p.id, publicId: p.publicId, client: p.client, company: p.company, clientEmail: p.clientEmail,
  title: p.title, value: Number(p.value) || 0, status: EN2PT[p.status] || "Rascunho",
  date: fmtDate(p.updatedAt || p.createdAt), scope: p.scope, items: Array.isArray(p.items) ? p.items : [],
  start: p.start, end: p.end, payment: p.payment, revisions: p.revisions, validity: p.validity,
  bio: p.bio, accent: p.accent, accent2: p.accent2 || "#6C48B0", gradient: !!p.gradient,
  logo: p.logo || null, cover: p.cover || null, template: p.template, createdAt: p.createdAt,
});

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
  const [showPreview, setShowPreview] = useState(true); // toggle do painel de pré-visualização
  const [onb, setOnb] = useState({});                   // progresso do tutorial (carregado por usuário)
  const [showPlans, setShowPlans] = useState(false);    // modal de planos (assinar)
  const [intro, setIntro] = useState(() => { try { return sessionStorage.getItem("manda_entering") === "1"; } catch { return false; } });
  const [billingMsg, setBillingMsg] = useState(null);
  const [draftPublicId, setDraftPublicId] = useState(null); // link público da proposta em edição
  const [sending, setSending] = useState(false);            // concluindo (salvando no servidor)
  const [flowError, setFlowError] = useState("");           // erro ao concluir (ex: limite do plano)
  const [toasts, setToasts] = useState([]);                 // pop-ups que somem após 4s
  const [notifs, setNotifs] = useState([]);                 // notificações (localStorage, por usuário)
  const [notifSeen, setNotifSeen] = useState(0);
  const firstNotifPoll = useRef(true);                      // evita "chuva" de toasts na 1ª carga

  // Pop-up efêmero (some sozinho em 4 segundos).
  const pushToast = (msg, kind = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  };
  const markNotifsSeen = () => {
    const now = Date.now();
    setNotifSeen(now);
    setSeen(user?.email, now);
  };

  const [serverDown, setServerDown] = useState(false);

  // Recarrega a lista: propostas do servidor + rascunhos locais (localStorage).
  const refreshRows = async () => {
    const local = loadProposals();
    try {
      const { proposals } = await api.listProposals();
      setRows([...local, ...proposals.map(fromApi)]);
      setServerDown(false);
    } catch (e) {
      setRows(local); // backend fora do ar: mostra ao menos os rascunhos locais
      if (e?.network) setServerDown(true);
    }
  };

  useEffect(() => {
    api.me().then((r) => setUser(r.user)).catch(() => {});
    refreshRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detecta perda/retorno de conexão do navegador.
  useEffect(() => {
    const goOnline = () => { setServerDown(false); refreshRows(); };
    const goOffline = () => setServerDown(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    if (typeof navigator !== "undefined" && navigator.onLine === false) setServerDown(true);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quando o usuário é conhecido: carrega o estado DELE (onboarding + notificações,
  // escopados por email) e inicia o polling. Trocar de conta troca o escopo — nada vaza.
  useEffect(() => {
    if (!user) return;
    const scope = user.email;
    setOnb(loadOnb(scope));
    setNotifs(loadNotifs(scope));
    setNotifSeen(getSeen(scope));
    firstNotifPoll.current = true;

    let alive = true;
    const load = async () => {
      try {
        const { notifications } = await api.notifications();
        if (!alive) return;
        const { list, added } = mergeNotifs(scope, notifications);
        setNotifs(list);
        if (!firstNotifPoll.current) added.forEach((n) => pushToast(notifLabel(n)));
        firstNotifPoll.current = false;
      } catch { /* backend fora: segue com o que está no localStorage */ }
    };
    load();
    const iv = setInterval(load, 30000);
    return () => { alive = false; clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Onboarding: só avança para quem tem plano ativo (grátis não conclui o tutorial).
  const onbActive = !!user && user.plan !== "free";
  const onbBioSet = (() => { try { return !!(localStorage.getItem(bioKeyFor(user?.email)) || "").trim(); } catch { return false; } })();
  const onbSteps = {
    create: onbActive && (!!onb.create || rows.length > 0),
    send: onbActive && (!!onb.send || rows.some((r) => r.status && r.status !== "Rascunho")),
    profile: onbActive && (!!onb.profile || onbBioSet),
  };
  const onbDone = onbSteps.create && onbSteps.send && onbSteps.profile;

  useEffect(() => {
    if (!onbActive) return; // não persiste progresso para grátis (nem sem usuário)
    if (onb.create === onbSteps.create && onb.send === onbSteps.send && onb.profile === onbSteps.profile) return;
    const merged = { ...onb, create: onbSteps.create, send: onbSteps.send, profile: onbSteps.profile };
    saveOnb(user.email, merged);
    setOnb(merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onbSteps.create, onbSteps.send, onbSteps.profile, onbActive]);

  const dismissOnb = () => { const next = { ...onb, hidden: true }; saveOnb(user?.email, next); setOnb(next); };

  // Concluiu 100%? O card de sucesso some sozinho em 7s e fica escondido para sempre.
  useEffect(() => {
    if (!onbActive || !onbDone || onb.hidden) return;
    const t = setTimeout(() => dismissOnb(), 7000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onbActive, onbDone, onb.hidden]);

  // Retorno do checkout do Stripe (?assinatura=ok|cancelada).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("assinatura");
    if (p === "ok") {
      setBillingMsg({ ok: true, text: "Pagamento recebido! Seu plano é ativado assim que o Stripe confirmar." });
      api.me().then((r) => setUser(r.user)).catch(() => {});
      window.history.replaceState({}, "", "/app");
    } else if (p === "cancelada") {
      setBillingMsg({ ok: false, text: "Assinatura cancelada. Pode tentar de novo quando quiser." });
      window.history.replaceState({}, "", "/app");
    }
  }, []);

  // Fecha modais com a tecla ESC.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (toDelete) setToDelete(null);
      else if (view === "editor" && flow === "done") setFlow("editing");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toDelete, view, flow]);

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

  const shareUrl = () => (draftPublicId ? `${window.location.origin}/p/${draftPublicId}` : "");
  const copyLink = () => {
    const url = shareUrl();
    if (!url) return;
    if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    pushToast("Link copiado para a área de transferência.", "success");
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

  // Corpo enviado à API (formato do proposalSchema do backend).
  const toApiBody = () => ({
    client: doc.client, company: doc.company, clientEmail: doc.clientEmail,
    title: doc.title, scope: doc.scope,
    items: doc.items.filter((it) => it.desc || it.value).map((it) => ({ desc: it.desc || "", value: String(it.value || "") })),
    start: doc.start, end: doc.end, payment: doc.payment, revisions: doc.revisions,
    validity: doc.validity, bio: doc.bio, accent: doc.accent, accent2: doc.accent2, gradient: !!doc.gradient,
    logo: doc.logo || "", cover: doc.cover || "", template: doc.template,
  });

  // Rascunho guardado localmente (não consome cota do plano até ser concluído).
  const buildLocalDraft = () => ({
    id: draftId, client: doc.client, company: doc.company, clientEmail: doc.clientEmail,
    title: doc.title || "Proposta sem título", value: total, status: "Rascunho", date: "Hoje",
    scope: doc.scope, items: doc.items, start: doc.start, end: doc.end,
    payment: doc.payment, revisions: doc.revisions, validity: doc.validity, bio: doc.bio,
    accent: doc.accent, accent2: doc.accent2, gradient: doc.gradient, logo: doc.logo, cover: doc.cover, template: doc.template,
    updatedAt: Date.now(),
  });

  const newProposal = () => {
    let bio = "";
    try { bio = localStorage.getItem(bioKeyFor(user?.email)) || ""; } catch { /* ignore */ }
    setDoc({ ...BLANK_DOC, bio });
    setDraftId(newId());
    setDraftPublicId(null);
    setFlowError("");
    setFlow("editing");
    setView("editor");
  };
  const openRow = (r) => {
    setDoc({
      ...BLANK_DOC,
      client: r.client || "", company: r.company || "", title: r.title === "Proposta sem título" ? "" : (r.title || ""),
      clientEmail: r.clientEmail || "", scope: r.scope || "",
      items: Array.isArray(r.items) && r.items.length ? r.items : BLANK_DOC.items,
      start: r.start || "", end: r.end || "", payment: r.payment || "",
      revisions: r.revisions || "", validity: r.validity || "", bio: r.bio || "",
      accent: r.accent || "#0A0A0A", accent2: r.accent2 || "#6C48B0", gradient: !!r.gradient, logo: r.logo || null, cover: r.cover || null, template: r.template || "minimal",
    });
    setDraftId(r.id || newId());
    setDraftPublicId(r.publicId || null);
    setFlowError("");
    setFlow("editing");
    setView("editor");
  };
  const onRowKey = (r) => (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openRow(r); } };

  const navTo = async (v) => {
    if (view === "editor" && flow !== "done" && hasContent) {
      if (draftId && !isLocalId(draftId)) {
        // já é proposta do servidor: atualiza o conteúdo (sem mexer no status)
        try { await api.updateProposal(draftId, toApiBody()); } catch { /* ignore */ }
      } else {
        // rascunho novo/local
        upsertProposal(buildLocalDraft());
      }
      await refreshRows();
    }
    setFlowError("");
    setFlow("editing");
    setView(v);
  };
  const exitEditor = () => navTo("list");

  const startWithDesign = (id) => {
    let bio = "";
    try { bio = localStorage.getItem(bioKeyFor(user?.email)) || ""; } catch { /* ignore */ }
    setDoc({ ...BLANK_DOC, template: id, bio });
    setDraftId(newId());
    setDraftPublicId(null);
    setFlowError("");
    setFlow("editing");
    setView("editor");
  };

  // Upload de imagem (logo ou capa) com limite de 2 MB.
  const MAX_IMG = 2 * 1024 * 1024;
  const onImage = (key) => async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { pushToast("Envie um arquivo de imagem.", "info"); return; }
    if (file.size > MAX_IMG) { pushToast("A imagem passa de 2 MB. Escolha um arquivo menor.", "info"); return; }
    try {
      const dataUrl = await compressImage(file, key);
      setDoc((d) => ({ ...d, [key]: dataUrl }));
    } catch { pushToast("Não foi possível processar a imagem.", "info"); }
  };

  // Concluir: salva no servidor, marca como enviada (sent) e obtém o link público.
  // Só liga a animação DEPOIS de salvo — assim o link já existe no modal "pronto".
  const finish = async () => {
    if (!canFinish || sending) return;
    setFlowError("");
    if (user?.plan === "free") {
      setShowPlans(true); // abre o modal de planos em vez de bloquear com texto
      return;
    }
    setSending(true);
    try {
      const body = toApiBody();
      let saved;
      if (draftId && !isLocalId(draftId)) {
        saved = (await api.updateProposal(draftId, body)).proposal;
      } else {
        saved = (await api.createProposal(body)).proposal; // conta na cota mensal do plano
        if (isLocalId(draftId)) removeProposal(draftId);    // o rascunho local vira proposta do servidor
      }
      const sent = (await api.setStatus(saved.id, "sent")).proposal;
      setDraftId(sent.id);
      setDraftPublicId(sent.publicId);
      await refreshRows();
      setFlow("finishing");
    } catch (err) {
      setFlowError(err.message || "Não foi possível concluir. Tente de novo.");
    } finally {
      setSending(false);
    }
  };

  // Decisão do cliente (Aceita/Recusada) — pode acontecer offline, então é manual.
  // Só existe para propostas já enviadas (no servidor); os demais status são automáticos.
  const setDecision = (r, pt) => async (e) => {
    e.stopPropagation();
    try { await api.setStatus(r.id, PT2EN[pt] || "sent"); } catch { /* ignore */ }
    await refreshRows();
    pushToast(
      pt === "Aceita" ? "Proposta marcada como aceita." : pt === "Recusada" ? "Proposta marcada como recusada." : "Proposta reaberta.",
      pt === "Aceita" ? "success" : "info"
    );
  };

  const confirmDelete = async () => {
    const r = toDelete;
    setToDelete(null);
    if (!r) return;
    if (isLocalId(r.id)) removeProposal(r.id);
    else { try { await api.deleteProposal(r.id); } catch { /* ignore */ } }
    await refreshRows();
    pushToast("Proposta excluída.", "info");
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

  const count = (f) => (FILTERS[f] ? rows.filter((r) => FILTERS[f].includes(r.status)).length : rows.length);
  const byFilter = FILTERS[filter] ? rows.filter((r) => FILTERS[filter].includes(r.status)) : rows;
  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () => (q ? byFilter.filter((r) => `${r.client || ""} ${r.company || ""} ${r.title || ""}`.toLowerCase().includes(q)) : byFilter),
    [byFilter, q]
  );
  const previewItems = doc.items.filter((it) => it.desc || it.value);
  const coverTpl = !!DESIGNS.find((d) => d.id === (doc.template || "minimal"))?.cover; // template com capa?

  const labelStyle = { fontSize: 13, fontWeight: 600, color: color.gray700 };
  const sectionLabel = { fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: color.gray400, marginBottom: 10 };
  const pvSection = { fontSize: "11.5px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: color.gray400, marginBottom: 8 };

  const unread = notifs.filter((n) => new Date(n.createdAt).getTime() > notifSeen).length;

  const nav = [
    { key: "list", label: "Propostas", Icon: FileText },
    { key: "templates", label: "Templates", Icon: LayoutGrid },
    { key: "clients", label: "Clientes", Icon: Users },
    { key: "notifications", label: "Notificações", Icon: Bell, badge: unread },
    { key: "settings", label: "Configurações", Icon: Settings },
  ];

  const profileName = user?.name || "Sua conta";
  // Propostas restantes no mês (conta só as concluídas no servidor deste mês).
  const monthStart0 = new Date(); monthStart0.setDate(1); monthStart0.setHours(0, 0, 0, 0);
  const usedThisMonth = rows.filter((r) => !isLocalId(r.id) && r.createdAt && new Date(r.createdAt) >= monthStart0).length;
  const quota = PLAN_QUOTA[user?.plan] ?? 0;
  const remaining = quota === Infinity ? Infinity : Math.max(0, quota - usedThisMonth);
  const quotaLow = !!user && user.plan !== "free" && quota !== Infinity && remaining === 0;
  const profileSub = !user
    ? "Não conectado"
    : user.plan === "free"
      ? "Sem plano ativo"
      : quota === Infinity
        ? "Propostas ilimitadas"
        : `${remaining} ${remaining === 1 ? "proposta restante" : "propostas restantes"}`;
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
        .db-nav-dot{ position:absolute; top:-3px; right:-4px; width:8px; height:8px; border-radius:50%; background:${color.accent}; border:2px solid #fff; }
        .db-nav-badge{ margin-left:auto; font-size:11px; font-weight:700; min-width:18px; height:18px; padding:0 5px; border-radius:999px; background:${color.accent}; color:#fff; display:inline-flex; align-items:center; justify-content:center; }
        .db-toasts{ position:fixed; right:20px; bottom:20px; z-index:400; display:flex; flex-direction:column; gap:10px; max-width:340px; }
        .db-toast{ display:flex; align-items:center; gap:10px; color:#fff; padding:12px 14px; border-radius:11px; box-shadow:0 14px 34px -14px rgba(20,20,30,0.55); font-size:13.5px; font-weight:500; line-height:1.35; animation:dbToastIn .28s cubic-bezier(.2,.8,.2,1) both; }
        .db-toast.success{ background:#1F7A48; }
        .db-toast.info{ background:${color.ink}; }
        @keyframes dbToastIn{ from{ opacity:0; transform:translateY(12px) scale(.98); } to{ opacity:1; transform:none; } }
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
        .db-thead, .db-row{ display:grid; grid-template-columns:minmax(180px,1.6fr) minmax(140px,1.3fr) 116px 130px 64px 108px; column-gap:16px; align-items:center; }
        .db-thead{ padding:12px 20px; background:${color.surface3}; border-bottom:1px solid #EEE; font-size:11.5px; font-weight:600; letter-spacing:0.04em; text-transform:uppercase; color:${color.gray400}; }
        .db-row{ padding:16px 20px; border-top:1px solid #F3F3F3; cursor:pointer; transition:background .12s ease; }
        .db-row:hover{ background:${color.surface2}; }
        .db-row:focus-visible{ outline:2px solid ${color.accent}; outline-offset:-2px; }
        .db-num{ text-align:right; font-variant-numeric:tabular-nums; }
        .db-c-del{ display:flex; justify-content:flex-end; }
        .db-del{ display:flex; align-items:center; justify-content:center; width:30px; height:30px; border:none; background:none; color:${color.gray400}; border-radius:7px; cursor:pointer; opacity:0; transition:opacity .14s ease, background .14s ease, color .14s ease; }
        .db-row:hover .db-del{ opacity:1; }
        .db-del:hover{ background:#FDECEA; color:#B4443C; }
        .db-act{ display:flex; align-items:center; justify-content:center; width:30px; height:30px; border:none; background:none; border-radius:8px; cursor:pointer; opacity:0; transition:opacity .14s ease, background .14s ease, color .14s ease, transform .12s ease; }
        .db-row:hover .db-act{ opacity:1; }
        .db-act:active{ transform:translateY(1px); }
        .db-act:focus-visible{ opacity:1; outline:2px solid ${color.accent}; outline-offset:1px; }
        .db-act-ok{ color:#2E7D51; } .db-act-ok:hover{ background:#EAF5EE; }
        .db-act-no{ color:#B4443C; } .db-act-no:hover{ background:#FDECEA; }
        .db-act-un{ color:${color.gray500}; } .db-act-un:hover{ background:${color.surface}; color:${color.ink}; }
        .db-del:focus-visible{ opacity:1; outline:2px solid ${color.accent}; outline-offset:1px; }

        .db-footbar{ flex:none; background:#fff; border-top:1px solid ${color.line2}; display:flex; align-items:center; justify-content:space-between; gap:14px 20px; padding:12px 24px 14px; flex-wrap:wrap; }
        .db-foot-summary{ display:flex; flex-direction:column; gap:1px; }
        .db-foot-cap{ font-size:11px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; color:${color.gray400}; }
        .db-foot-line{ display:flex; align-items:baseline; gap:7px; }
        .db-foot-money{ font-family:${font.heading}; font-weight:700; font-size:19px; letter-spacing:-0.01em; font-variant-numeric:tabular-nums; color:${color.ink}; }
        .db-foot-meta{ font-size:12.5px; color:${color.gray400}; }
        .db-foot-actions{ display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
        .db-foot-checks{ display:flex; align-items:center; gap:10px; }
        .db-req{ display:inline-flex; align-items:center; gap:6px; font-size:12.5px; font-weight:600; color:${color.gray400}; transition:color .18s ease; }
        .db-req.on{ color:#2E7D51; }
        .db-req-dot{ width:12px; height:12px; border-radius:50%; border:1.5px solid ${color.gray300}; display:inline-block; }
        .db-finish{ font-size:15px; padding:12px 22px; border-radius:11px; box-shadow:0 8px 18px -8px rgba(217,119,87,0.55); }
        .db-finish:disabled{ box-shadow:none; }
        .db-foot-err{ flex-basis:100%; font-size:13px; color:#B4443C; font-weight:600; margin-top:2px; }
        .db-onb{ background:#fff; border:1px solid ${color.line2}; border-radius:16px; padding:20px 22px; margin-bottom:22px; box-shadow:0 12px 34px -22px rgba(20,20,30,0.25); animation:dbUp .4s ease both; }
        .db-onb-done{ background:linear-gradient(180deg, ${color.accentTint} 0%, #fff 70%); }
        .db-onb-trophy{ width:44px; height:44px; flex:none; border-radius:50%; background:#EAF5EE; color:#2E7D51; display:flex; align-items:center; justify-content:center; }
        .db-onb-bar{ height:7px; border-radius:999px; background:${color.surface}; overflow:hidden; }
        .db-onb-bar span{ display:block; height:100%; background:${color.accent}; border-radius:999px; transition:width .45s cubic-bezier(.2,.8,.2,1); }
        .db-onb-step{ display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:11px; border:1px solid ${color.line2}; transition:background .15s ease, border-color .15s ease; }
        .db-onb-step.done{ border-color:transparent; background:${color.surface2}; }
        .db-onb-check{ width:22px; height:22px; flex:none; border-radius:50%; border:2px solid ${color.gray300}; display:flex; align-items:center; justify-content:center; color:#fff; transition:background .2s ease, border-color .2s ease; }
        .db-onb-check.on{ border-color:#2E7D51; background:#2E7D51; }
        .db-planbar{ display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; background:${color.accentTint}; border:1px solid ${color.accentLine}; border-radius:14px; padding:14px 18px; margin-bottom:18px; }
        .db-planbar-icon{ width:36px; height:36px; flex:none; border-radius:10px; background:#fff; color:${color.accentInk}; display:flex; align-items:center; justify-content:center; }
        .db-plans-card{ position:relative; width:100%; max-width:820px; background:#fff; border:1px solid ${color.line}; border-radius:18px; box-shadow:0 30px 70px -22px rgba(20,20,30,0.35); padding:28px 28px 30px; max-height:92vh; overflow:auto; animation:dbPop .38s cubic-bezier(.2,.8,.2,1) both; }
        .db-plans-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
        .db-plan{ border-radius:14px; padding:22px 18px 20px; background:#fff; }
        @media (max-width:720px){ .db-plans-grid{ grid-template-columns:1fr; } }
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
        .db-flow-card{ position:relative; width:100%; max-width:440px; background:#fff; border:1px solid ${color.line}; border-radius:18px; box-shadow:0 30px 70px -22px rgba(20,20,30,0.35); padding:32px 30px; animation:dbPop .38s cubic-bezier(.2,.8,.2,1) both; overflow-wrap:anywhere; word-break:break-word; }
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
          .db-del, .db-act{ opacity:1; }
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
            const on = view === n.key || (n.key === "list" && view === "editor");
            return (
              <a key={n.key} href="#" className={on ? "on" : "idle"} title={n.label} aria-current={on ? "page" : undefined}
                onClick={(e) => { e.preventDefault(); navTo(n.key); }}>
                <span style={{ display: "flex", flex: "none", position: "relative" }}>
                  <n.Icon size={18} strokeWidth={1.9} />
                  {n.badge > 0 && <span className="db-nav-dot" />}
                </span>
                <span className="db-collapsed" style={{ flex: 1 }}>{n.label}</span>
                {n.badge > 0 && <span className="db-collapsed db-nav-badge">{n.badge}</span>}
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
              <div style={{ fontSize: 12, color: quotaLow ? "#B4443C" : color.gray400, fontWeight: quotaLow ? 600 : 400 }}>{profileSub}</div>
            </div>
            <button onClick={() => { setToken(null); go && go("landing"); }} className="db-collapsed db-logout" aria-label="Sair" title="Sair"><LogOut size={17} strokeWidth={1.9} /></button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="db-main">
        {serverDown && (
          <div style={{ background: "#FEF3E2", borderBottom: "1px solid #F5D9A8", color: "#8A5A1A", fontSize: "13.5px", fontWeight: 500, padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}><AlertTriangle size={15} strokeWidth={2} />Sem conexão com o servidor. Você ainda vê o que já carregou, mas concluir e sincronizar precisam de internet.</span>
            <button onClick={() => refreshRows()} className="db-btn" style={{ fontSize: 13, fontWeight: 600, color: "#8A5A1A", background: "#fff", border: "1px solid #F0C98A", borderRadius: 8, padding: "6px 12px", flex: "none" }}>Tentar de novo</button>
          </div>
        )}
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

            {user?.plan === "free" && (
              <div className="db-planbar">
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <span className="db-planbar-icon"><Lock size={16} strokeWidth={2.2} /></span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Você está no plano grátis</div>
                    <div style={{ fontSize: "12.5px", color: color.gray600 }}>Assine um plano para concluir e enviar propostas aos seus clientes.</div>
                  </div>
                </div>
                <button onClick={() => setShowPlans(true)} className="db-btn db-btn-accent" style={{ fontSize: 14, padding: "9px 16px", flex: "none" }}>Ver planos</button>
              </div>
            )}

            {!onb.hidden && (
              <OnboardingCard steps={onbSteps} done={onbDone} onNew={newProposal} goSettings={() => navTo("settings")} onSkip={dismissOnb} onFinish={dismissOnb} />
            )}

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
                        <span className="db-status-sel" title={`Status: ${r.status || "Rascunho"}`} style={{ display: "inline-block", cursor: "default", color: sc.c, background: sc.bg, border: `1px solid ${sc.b}` }}>{r.status || "Rascunho"}</span>
                      </span>
                      <span className="db-c-date db-num" style={{ fontSize: 13, color: color.gray400 }}>{r.date || ""}</span>
                      <span className="db-c-del" style={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
                        {(r.status === "Enviada" || r.status === "Visualizada") && (
                          <>
                            <button className="db-act db-act-ok" onClick={setDecision(r, "Aceita")} aria-label="Marcar como aceita" title="Cliente aceitou"><Check size={16} strokeWidth={2.6} /></button>
                            <button className="db-act db-act-no" onClick={setDecision(r, "Recusada")} aria-label="Marcar como recusada" title="Cliente recusou"><X size={16} strokeWidth={2.4} /></button>
                          </>
                        )}
                        {(r.status === "Aceita" || r.status === "Recusada") && (
                          <button className="db-act db-act-un" onClick={setDecision(r, "Enviada")} aria-label="Reabrir proposta" title="Reabrir (volta para Enviada)"><RotateCcw size={15} strokeWidth={2.2} /></button>
                        )}
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
        ) : view === "notifications" ? (
          <NotificationsPanel notifs={notifs} seen={notifSeen} onSeen={markNotifsSeen} />
        ) : view === "settings" ? (
          <SettingsPanel user={user} setUser={setUser} go={go} pushToast={pushToast} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
            {/* action bar */}
            <div style={{ flex: "none", minHeight: 60, background: color.white, borderBottom: `1px solid ${color.line2}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 20px", flexWrap: "wrap" }}>
              <button onClick={exitEditor} className="db-btn" style={{ fontSize: 14, fontWeight: 500, color: color.gray600, background: "none", padding: "6px 8px" }}>
                <ArrowLeft size={17} strokeWidth={2.2} />Propostas
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: color.gray400, marginRight: 6, display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: hasContent ? "#22C55E" : color.gray300 }} />{hasContent ? "Rascunho salvo ao sair" : "Rascunho"}</span>
                <button onClick={() => setShowPreview((v) => !v)} className="db-btn db-btn-ghost" style={{ fontSize: 14, padding: "9px 15px" }} aria-pressed={showPreview}><Eye size={15} strokeWidth={2} />{showPreview ? "Ocultar prévia" : "Pré-visualizar"}</button>
              </div>
            </div>

            {/* split */}
            <div className="db-split" style={{ flex: 1, display: "grid", gridTemplateColumns: showPreview ? "1fr 1fr" : "1fr", minHeight: 0 }}>
              {/* editor side */}
              <div style={{ overflow: "auto", padding: "32px 36px", borderRight: showPreview ? `1px solid ${color.line2}` : "none" }}>
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
                        <input type="file" accept="image/*" onChange={onImage("logo")} style={{ display: "none" }} />
                        {doc.logo
                          ? <img src={doc.logo} alt="" style={{ width: 40, height: 40, borderRadius: 9, objectFit: "cover", display: "block" }} />
                          : <span style={{ width: 40, height: 40, borderRadius: 9, background: color.surface, color: color.gray400, display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={20} strokeWidth={1.9} /></span>}
                        <span style={{ fontSize: "13.5px", fontWeight: 500, color: color.gray500 }}>{doc.logo ? "Trocar logo" : "Enviar sua logo"}</span>
                      </label>
                      {doc.logo && <button onClick={() => setDoc((d) => ({ ...d, logo: null }))} className="db-btn" style={{ marginTop: 8, fontSize: "12.5px", color: color.gray500, background: "none", padding: "2px 4px", gap: 5 }}><X size={13} strokeWidth={2.2} />Remover</button>}
                      <div style={{ fontSize: "11.5px", color: color.gray400, marginTop: 6 }}>Quadrada (1:1), recomendado 400×400 px — assim não corta. PNG ou JPG, até 2 MB.</div>
                    </div>
                    {coverTpl && (
                      <div>
                        <div style={sectionLabel}>Capa</div>
                        <label className="db-btn" style={{ display: "flex", alignItems: "center", gap: 12, background: "none", border: "1px dashed #DDD", borderRadius: 11, padding: 12, width: "fit-content", cursor: "pointer" }}>
                          <input type="file" accept="image/*" onChange={onImage("cover")} style={{ display: "none" }} />
                          {doc.cover
                            ? <img src={doc.cover} alt="" style={{ width: 66, height: 40, borderRadius: 9, objectFit: "cover", display: "block" }} />
                            : <span style={{ width: 66, height: 40, borderRadius: 9, background: color.surface, color: color.gray400, display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={20} strokeWidth={1.9} /></span>}
                          <span style={{ fontSize: "13.5px", fontWeight: 500, color: color.gray500 }}>{doc.cover ? "Trocar capa" : "Enviar capa (foto)"}</span>
                        </label>
                        {doc.cover && <button onClick={() => setDoc((d) => ({ ...d, cover: null }))} className="db-btn" style={{ marginTop: 8, fontSize: "12.5px", color: color.gray500, background: "none", padding: "2px 4px", gap: 5 }}><X size={13} strokeWidth={2.2} />Remover</button>}
                        <div style={{ fontSize: "11.5px", color: color.gray400, marginTop: 6 }}>Horizontal (paisagem), recomendado 1600×600 px — assim não corta. JPG ou PNG, até 2 MB.</div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={sectionLabel}>Cor</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 8, border: `1px solid ${color.gray200}`, borderRadius: 10, padding: "5px 10px", cursor: "pointer" }}>
                        <input type="color" value={doc.accent} onChange={(e) => setDoc((d) => ({ ...d, accent: e.target.value }))} style={{ width: 26, height: 26, border: "none", background: "none", padding: 0, cursor: "pointer" }} aria-label="Escolher cor" />
                        <input value={doc.accent} onChange={(e) => setDoc((d) => ({ ...d, accent: e.target.value }))} maxLength={20} style={{ width: 82, border: "none", outline: "none", fontFamily: font.body, fontSize: 13, textTransform: "uppercase", color: color.ink }} aria-label="Cor em hexadecimal" />
                      </label>
                      <div style={{ display: "flex", gap: 7 }}>
                        {PRESET_COLORS.map((c) => (
                          <button key={c} className="db-swatch" onClick={() => setDoc((d) => ({ ...d, accent: c }))} aria-label={`Cor ${c}`} title={c}
                            style={{ width: 22, height: 22, background: c, boxShadow: (doc.accent || "").toLowerCase() === c.toLowerCase() ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : `0 0 0 1px ${color.line}` }} />
                        ))}
                      </div>
                    </div>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 13, color: color.gray600, cursor: "pointer" }}>
                      <input type="checkbox" checked={!!doc.gradient} onChange={(e) => setDoc((d) => ({ ...d, gradient: e.target.checked }))} />
                      Usar gradiente <span style={{ color: color.gray400, fontSize: 12 }}>(nos modelos Bold e Colorido)</span>
                    </label>
                    {doc.gradient && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                        <span style={{ fontSize: "12.5px", color: color.gray500 }}>Segunda cor</span>
                        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, border: `1px solid ${color.gray200}`, borderRadius: 10, padding: "5px 10px", cursor: "pointer" }}>
                          <input type="color" value={doc.accent2} onChange={(e) => setDoc((d) => ({ ...d, accent2: e.target.value }))} style={{ width: 26, height: 26, border: "none", background: "none", padding: 0, cursor: "pointer" }} aria-label="Segunda cor" />
                          <input value={doc.accent2} onChange={(e) => setDoc((d) => ({ ...d, accent2: e.target.value }))} maxLength={20} style={{ width: 82, border: "none", outline: "none", fontFamily: font.body, fontSize: 13, textTransform: "uppercase", color: color.ink }} aria-label="Segunda cor em hexadecimal" />
                        </label>
                        <span style={{ width: 44, height: 26, borderRadius: 7, background: `linear-gradient(135deg, ${doc.accent}, ${doc.accent2})`, border: `1px solid ${color.line}` }} />
                      </div>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <Field label="Cliente" required><input className="db-input" value={doc.client} onChange={updDoc("client")} maxLength={LIMITS.client} placeholder="Nome do cliente" style={inp()} /></Field>
                    <Field label="Empresa"><input className="db-input" value={doc.company} onChange={updDoc("company")} maxLength={LIMITS.company} placeholder="Empresa" style={inp()} /></Field>
                  </div>
                  <Field label="Título da proposta" required><input className="db-input" value={doc.title} onChange={updDoc("title")} maxLength={LIMITS.title} placeholder="Ex: Produção de vídeo institucional" style={inp()} /></Field>

                  <div>
                    <div style={sectionLabel}>Escopo</div>
                    <textarea className="db-input" value={doc.scope} onChange={updDoc("scope")} maxLength={LIMITS.scope} rows={4} placeholder="Descreva o que está incluído no serviço." style={{ ...inp(), resize: "vertical", lineHeight: 1.5 }} />
                    <div style={{ fontSize: "12px", color: color.gray400, marginTop: 5, textAlign: "right" }}>{doc.scope.length}/{LIMITS.scope}</div>
                  </div>

                  <div>
                    <div style={sectionLabel}>Investimento</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {doc.items.map((it, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input className="db-input" value={it.desc} onChange={updItem(i, "desc")} maxLength={LIMITS.itemDesc} placeholder="Item" style={{ ...inp(), flex: 1 }} />
                          <div className="db-input" style={{ display: "flex", alignItems: "center", gap: 4, flex: "none", width: 118, border: `1px solid ${color.gray200}`, borderRadius: 9, padding: "0 10px", background: color.white }}>
                            <span style={{ fontSize: 13, color: color.gray400 }}>R$</span>
                            <input value={it.value} onChange={updItem(i, "value")} maxLength={LIMITS.itemValue} inputMode="numeric" placeholder="0" style={{ width: "100%", border: "none", outline: "none", fontFamily: font.body, fontSize: 14, padding: "10px 0", background: "transparent" }} />
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
                    <Field label="Início"><input className="db-input" value={doc.start} onChange={updDoc("start")} maxLength={LIMITS.start} placeholder="Ex: 10 de agosto" style={inp()} /></Field>
                    <Field label="Entrega"><input className="db-input" value={doc.end} onChange={updDoc("end")} maxLength={LIMITS.end} placeholder="Ex: 5 de setembro" style={inp()} /></Field>
                  </div>

                  <div>
                    <div style={sectionLabel}>Condições</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <Field label="Forma de pagamento"><input className="db-input" value={doc.payment} onChange={updDoc("payment")} maxLength={LIMITS.payment} placeholder="Ex: 50% na aprovação, 50% na entrega" style={inp()} /></Field>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                        <Field label="Revisões inclusas"><input className="db-input" value={doc.revisions} onChange={updDoc("revisions")} maxLength={LIMITS.revisions} placeholder="Ex: 2 rodadas" style={inp()} /></Field>
                        <Field label="Validade"><input className="db-input" value={doc.validity} onChange={updDoc("validity")} maxLength={LIMITS.validity} placeholder="Ex: 15 dias" style={inp()} /></Field>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div style={sectionLabel}>Sobre mim</div>
                    <textarea className="db-input" value={doc.bio} onChange={updDoc("bio")} maxLength={LIMITS.bio} rows={3} placeholder="Uma breve apresentação sua." style={{ ...inp(), resize: "vertical", lineHeight: 1.5 }} />
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: "12.5px", color: color.gray400, marginTop: 6 }}>
                      <span>Salvo para a próxima proposta automaticamente.</span>
                      <span>{doc.bio.length}/{LIMITS.bio}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* preview side */}
              {showPreview && (
                <div className="db-preview" style={{ overflow: "auto", background: color.surface, padding: "32px 36px" }}>
                  <ProposalDesign id={doc.template} doc={doc} accent={doc.accent} />
                </div>
              )}
            </div>

            {/* barra inferior */}
            <div className="db-footbar">
              <div className="db-foot-summary">
                <span className="db-foot-cap">Você vai cobrar</span>
                <span className="db-foot-line">
                  <span className="db-foot-money">{brl(total)}</span>
                  <span className="db-foot-meta">· {itemCount} {itemCount === 1 ? "item" : "itens"}</span>
                </span>
              </div>

              <div className="db-foot-actions">
                <button onClick={finish} disabled={!canFinish || sending} className="db-btn db-btn-accent db-finish">
                  <Check size={17} strokeWidth={2.6} />{sending ? "Concluindo…" : "Concluir proposta"}
                </button>
              </div>

              {flowError && <div className="db-foot-err">{flowError}</div>}
            </div>
          </div>
        )}
      </main>

      {/* FLOW DE CONCLUSÃO */}
      {view === "editor" && flow !== "editing" && (
        <div className="db-flow" onClick={() => { if (flow === "done") setFlow("editing"); }}>
          <div className="db-flow-card" onClick={(e) => e.stopPropagation()}>
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
                <button onClick={() => setFlow("editing")} aria-label="Fechar" className="db-btn" style={{ position: "absolute", top: 12, right: 12, background: "none", color: color.gray400, padding: 4 }}><X size={20} strokeWidth={2} /></button>
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

      {billingMsg && (
        <div onClick={() => setBillingMsg(null)} role="status" style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 150, cursor: "pointer", background: billingMsg.ok ? "#EAF5EE" : "#FDECEA", color: billingMsg.ok ? "#2E7D51" : "#B4443C", border: `1px solid ${billingMsg.ok ? "#C9E7D5" : "#F5D2CD"}`, borderRadius: 12, padding: "12px 16px", fontSize: 14, fontWeight: 600, boxShadow: "0 10px 30px -12px rgba(20,20,30,0.25)", maxWidth: "90vw", animation: "mandaFadeUp .3s ease both" }}>
          {billingMsg.text}
        </div>
      )}

      {intro && (
        <div className="db-intro" aria-hidden="true">
          <div className="db-intro-mark">M</div>
        </div>
      )}

      {showPlans && <PlansModal onClose={() => setShowPlans(false)} />}

      {/* POP-UPS (somem após 4s) */}
      {toasts.length > 0 && (
        <div className="db-toasts" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`db-toast ${t.kind}`}>
              <span style={{ display: "flex", flex: "none" }}>{t.kind === "success" ? <Check size={16} strokeWidth={2.6} /> : <Bell size={15} strokeWidth={2.2} />}</span>
              <span>{t.msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationsPanel({ notifs, seen, onSeen }) {
  useEffect(() => {
    const t = setTimeout(() => onSeen && onSeen(), 1500); // deixa destacar as novas antes de marcar como lidas
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = (type) => type === "accepted" ? { I: Check, c: "#2E7D51", bg: "#EAF5EE" }
    : type === "declined" ? { I: X, c: "#B4443C", bg: "#FDECEA" }
    : { I: Eye, c: color.accentInk, bg: color.accentTint };

  return (
    <div className="db-pad" style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 27, letterSpacing: "-0.02em", margin: "0 0 4px" }}>Notificações</h1>
        <p style={{ fontSize: "14.5px", color: color.gray500, margin: 0 }}>Cada vez que um cliente interage com suas propostas, aparece aqui.</p>
      </div>

      {notifs.length ? (
        <div style={{ background: "#fff", border: `1px solid ${color.line2}`, borderRadius: 14, overflow: "hidden" }}>
          {notifs.map((n, i) => {
            const s = style(n.type);
            const isNew = new Date(n.createdAt).getTime() > seen;
            return (
              <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderTop: i ? "1px solid #F3F3F3" : "none", background: isNew ? color.accentTint : "#fff", transition: "background .4s ease" }}>
                <span style={{ width: 34, height: 34, flex: "none", borderRadius: "50%", background: s.bg, color: s.c, display: "flex", alignItems: "center", justifyContent: "center" }}><s.I size={16} strokeWidth={2.4} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: color.ink }}>
                    <strong style={{ fontWeight: 600 }}>{(n.client || "Alguém").trim() || "Alguém"}</strong> {NOTIF_VERB[n.type] || "interagiu com"} <span style={{ color: color.gray600 }}>“{n.title || "sua proposta"}”</span>
                  </div>
                  <div style={{ fontSize: 12, color: color.gray400, display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}><Clock size={12} strokeWidth={2} />{timeAgo(n.createdAt)}</div>
                </div>
                {isNew && <span style={{ width: 8, height: 8, flex: "none", borderRadius: "50%", background: color.accent }} />}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px dashed #DDD", borderRadius: 16, padding: "56px 24px", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, margin: "0 auto 18px", borderRadius: 14, background: color.accentTint, color: color.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><Bell size={26} strokeWidth={1.9} /></div>
          <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 19, marginBottom: 6 }}>Nada por aqui ainda</div>
          <p style={{ fontSize: 14.5, color: color.gray500, margin: 0 }}>Quando um cliente abrir ou responder uma proposta, você fica sabendo aqui.</p>
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

function PlansModal({ onClose }) {
  const [annual, setAnnual] = useState(false);
  const [busyKey, setBusyKey] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const subscribe = async (planKey) => {
    setErr("");
    setBusyKey(planKey);
    try {
      const { url } = await api.checkout(planKey, annual ? "year" : "month");
      if (!url) throw new Error("Não foi possível iniciar o checkout. Confira a configuração do Stripe.");
      window.location.href = url; // gateway do Stripe
    } catch (e) { setErr(e.message || "Falha ao iniciar o checkout."); setBusyKey(""); }
  };

  const plans = [
    { name: "Básico", key: "basic", m: "R$12", y: "R$11", yNote: "R$132/ano", cta: "Assinar Básico", variant: "ghost", popular: false,
      features: ["5 propostas por mês", "Templates básicos", "Link compartilhável"] },
    { name: "Pro", key: "pro", m: "R$29", y: "R$26", yNote: "R$312/ano", cta: "Assinar Pro", variant: "accent", popular: true,
      features: ["25 propostas por mês", "Todos os templates", "Notificação de visualização", "Sem marca d’água"] },
    { name: "Business", key: "business", m: "R$97", y: "R$87", yNote: "R$1.044/ano", cta: "Assinar Business", variant: "dark", popular: false,
      features: ["Propostas ilimitadas", "Todos os templates", "Domínio personalizado", "Suporte prioritário"] },
  ];

  return (
    <div className="db-flow" onClick={onClose}>
      <div className="db-plans-card" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Fechar" className="db-btn" style={{ position: "absolute", top: 14, right: 14, background: "none", color: color.gray400, padding: 4 }}><X size={20} strokeWidth={2} /></button>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 22, letterSpacing: "-0.01em" }}>Escolha seu plano</div>
          <div style={{ fontSize: "13.5px", color: color.gray500, marginTop: 4 }}>Assine para concluir e enviar suas propostas aos clientes.</div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
          <div style={{ display: "inline-flex", gap: 4, background: color.surface, borderRadius: 10, padding: 4 }}>
            <button onClick={() => setAnnual(false)} className="db-btn" style={{ fontSize: "13.5px", fontWeight: 600, padding: "7px 14px", borderRadius: 7, background: !annual ? "#fff" : "transparent", color: !annual ? color.ink : color.gray500, boxShadow: !annual ? "0 1px 2px rgba(0,0,0,0.08)" : "none" }}>Mensal</button>
            <button onClick={() => setAnnual(true)} className="db-btn" style={{ fontSize: "13.5px", fontWeight: 600, padding: "7px 14px", borderRadius: 7, background: annual ? "#fff" : "transparent", color: annual ? color.ink : color.gray500, boxShadow: annual ? "0 1px 2px rgba(0,0,0,0.08)" : "none" }}>
              Anual <span style={{ fontSize: 11, fontWeight: 700, color: color.accentInk, background: color.accentTint, padding: "1px 6px", borderRadius: 999, marginLeft: 4 }}>-10%</span>
            </button>
          </div>
        </div>

        <div className="db-plans-grid">
          {plans.map((p) => (
            <div key={p.key} className="db-plan" style={{ border: p.popular ? `1.5px solid ${color.accent}` : `1px solid ${color.line2}`, position: "relative" }}>
              {p.popular && <span style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", fontSize: 11, fontWeight: 700, color: "#fff", background: color.accent, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>Mais popular</span>}
              <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 17 }}>{p.name}</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 5, margin: "8px 0 2px" }}>
                <span style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 30, letterSpacing: "-0.02em" }}>{annual ? p.y : p.m}</span>
                <span style={{ fontSize: 13, color: color.gray500, marginBottom: 4 }}>/mês</span>
              </div>
              <div style={{ fontSize: 12, color: color.gray400, minHeight: 16, marginBottom: 14 }}>{annual ? `${p.yNote} · cobrado anualmente` : "cobrado mensalmente"}</div>
              <button onClick={() => subscribe(p.key)} disabled={!!busyKey} className={`db-btn db-btn-${p.variant}`} style={{ width: "100%", fontSize: 14, padding: "11px" }}>{busyKey === p.key ? "Abrindo…" : p.cta}</button>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
                {p.features.map((f, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, lineHeight: 1.4, color: color.gray700 }}>
                    <span style={{ flex: "none", marginTop: 1, display: "flex", color: "#2E7D51" }}><Check size={14} strokeWidth={2.6} /></span>{f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {err && <div style={{ marginTop: 14, fontSize: 13, color: "#B4443C", textAlign: "center" }}>{err}</div>}
        <div style={{ marginTop: 14, textAlign: "center", fontSize: 12, color: color.gray400 }}>Pagamento seguro via Stripe · cancele quando quiser</div>
      </div>
    </div>
  );
}

function OnboardingCard({ steps, done, onNew, goSettings, onSkip, onFinish }) {
  const items = [
    { key: "create", title: "Crie sua primeira proposta", desc: "Monte um orçamento com seus itens e valores.", action: onNew, cta: "Criar proposta" },
    { key: "send", title: "Conclua e gere o link", desc: "Finalize uma proposta para receber o link de compartilhar.", action: onNew, cta: "Concluir uma" },
    { key: "profile", title: "Configure seu “Sobre mim”", desc: "Uma apresentação que entra em toda proposta nova.", action: goSettings, cta: "Configurações" },
  ];
  const doneCount = items.filter((it) => steps[it.key]).length;
  const pct = Math.round((doneCount / items.length) * 100);

  if (done) {
    return (
      <div className="db-onb db-onb-done">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span className="db-onb-trophy"><Check size={22} strokeWidth={3} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em" }}>Tudo pronto! Você já domina o essencial.</div>
            <div style={{ fontSize: "13.5px", color: color.gray500 }}>Agora é criar propostas e fechar negócios.</div>
          </div>
          <button onClick={onFinish} className="db-btn db-btn-dark" style={{ fontSize: 14, padding: "10px 18px", flex: "none" }}>Começar a usar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="db-onb">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em" }}>Primeiros passos no Manda</div>
          <div style={{ fontSize: "13.5px", color: color.gray500 }}>{doneCount} de {items.length} concluídos</div>
        </div>
        <button onClick={onSkip} className="db-btn" style={{ background: "none", color: color.gray400, fontSize: "12.5px", padding: "4px 6px", flex: "none" }}>Pular tutorial</button>
      </div>
      <div className="db-onb-bar"><span style={{ width: `${pct}%` }} /></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
        {items.map((it) => {
          const ok = steps[it.key];
          return (
            <div key={it.key} className={ok ? "db-onb-step done" : "db-onb-step"}>
              <span className={ok ? "db-onb-check on" : "db-onb-check"}>{ok && <Check size={13} strokeWidth={3.2} />}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: ok ? color.gray400 : color.ink, textDecoration: ok ? "line-through" : "none" }}>{it.title}</div>
                {!ok && <div style={{ fontSize: "12.5px", color: color.gray500 }}>{it.desc}</div>}
              </div>
              {!ok && <button onClick={it.action} className="db-btn db-btn-ghost" style={{ fontSize: 13, padding: "7px 12px", flex: "none" }}>{it.cta}</button>}
            </div>
          );
        })}
      </div>
    </div>
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
  const [period, setPeriod] = useState("all");
  const thisYear = new Date().getFullYear();
  const MONTHS_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const YEARS = [thisYear, thisYear - 1, thisYear - 2];
  const [selM, setSelM] = useState("");            // "01".."12" ou "" (Todos)
  const [selY, setSelY] = useState(String(thisYear));
  const monthKey = selM ? `${selY}-${selM}` : "";  // "YYYY-MM" quando um mês específico está escolhido
  const OPENED = ["Visualizada", "Aceita", "Recusada"];
  const num = (v) => Number(v) || 0;
  const PERIODS = [["all", "Tudo"], ["today", "Hoje"], ["7d", "7 dias"], ["month", "Este mês"], ["lastmonth", "Mês passado"]];

  // Intervalo [início, fim) em ms — um mês escolhido tem prioridade sobre o preset.
  const range = () => {
    if (monthKey) {
      const [y, m] = monthKey.split("-").map(Number);
      return [new Date(y, m - 1, 1).getTime(), new Date(y, m, 1).getTime()];
    }
    const now = new Date();
    if (period === "today") { const s = new Date(now); s.setHours(0, 0, 0, 0); return [s.getTime(), Infinity]; }
    if (period === "7d") return [Date.now() - 7 * 864e5, Infinity];
    if (period === "month") return [new Date(now.getFullYear(), now.getMonth(), 1).getTime(), Infinity];
    if (period === "lastmonth") return [new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(), new Date(now.getFullYear(), now.getMonth(), 1).getTime()];
    return null; // Tudo
  };
  const rowTime = (r) => {
    if (r.createdAt) { const t = new Date(r.createdAt).getTime(); if (!isNaN(t)) return t; }
    if (typeof r.updatedAt === "number") return r.updatedAt;
    if (r.updatedAt) { const t = new Date(r.updatedAt).getTime(); if (!isNaN(t)) return t; }
    return null;
  };
  const rg = range();
  const filtered = rg ? rows.filter((r) => { const t = rowTime(r); return t != null && t >= rg[0] && t < rg[1]; }) : rows;

  const receita = filtered.filter((r) => r.status === "Aceita").reduce((a, r) => a + num(r.value), 0);
  const emAberto = filtered.filter((r) => r.status === "Enviada" || r.status === "Visualizada").reduce((a, r) => a + num(r.value), 0);
  const enviadas = filtered.filter((r) => r.status && r.status !== "Rascunho").length;
  const aceitas = filtered.filter((r) => r.status === "Aceita").length;
  const conv = enviadas ? Math.round((aceitas / enviadas) * 100) : 0;

  const map = {};
  filtered.forEach((r) => {
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
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 27, letterSpacing: "-0.02em", margin: "0 0 4px" }}>Clientes</h1>
        <p style={{ fontSize: "14.5px", color: color.gray500, margin: 0 }}>Acompanhe suas propostas por cliente e a receita do período.</p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div style={{ display: "inline-flex", background: color.surface, border: `1px solid ${color.gray200}`, borderRadius: 10, padding: 3, gap: 2 }}>
          {PERIODS.map(([key, label]) => {
            const on = !monthKey && period === key;
            return (
              <button key={key} onClick={() => { setSelM(""); setPeriod(key); }} className="db-btn"
                style={{ fontSize: 13, fontWeight: 600, padding: "6px 12px", borderRadius: 8, background: on ? "#fff" : "transparent", color: on ? color.ink : color.gray500, boxShadow: on ? "0 1px 2px rgba(0,0,0,0.08)" : "none" }}>
                {label}
              </button>
            );
          })}
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: color.gray500, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Calendar size={15} strokeWidth={2} color={monthKey ? color.accent : color.gray400} />Mês específico:
          </span>
          <select value={selM} onChange={(e) => setSelM(e.target.value)} aria-label="Mês" style={{ ...inp(), width: "auto", padding: "8px 12px", cursor: "pointer" }}>
            <option value="">Todos</option>
            {MONTHS_FULL.map((m, i) => <option key={i} value={String(i + 1).padStart(2, "0")}>{m}</option>)}
          </select>
          <select value={selY} onChange={(e) => setSelY(e.target.value)} aria-label="Ano" disabled={!selM} style={{ ...inp(), width: "auto", padding: "8px 12px", cursor: selM ? "pointer" : "not-allowed", opacity: selM ? 1 : 0.5 }}>
            {YEARS.map((y) => <option key={y} value={String(y)}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="db-kpi-grid">
        <Kpi label="Receita" value={brl(receita)} tint="#2E7D51" />
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

function SettingsPanel({ user, setUser, go, pushToast }) {
  const [name, setName] = useState(user?.name || "");
  const [savingName, setSavingName] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [savingPw, setSavingPw] = useState(false);
  const [pwErr, setPwErr] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [bio, setBio] = useState(() => { try { return localStorage.getItem(bioKeyFor(user?.email)) || ""; } catch { return ""; } });
  const [stats, setStats] = useState(null);

  useEffect(() => {
    setName(user?.name || "");
    try { setBio(localStorage.getItem(bioKeyFor(user?.email)) || ""); } catch { /* ignore */ }
  }, [user]);
  useEffect(() => { api.stats().then(setStats).catch(() => {}); }, []);

  const saveName = async () => {
    const v = name.trim();
    if (!v || v === (user?.name || "") || savingName) return;
    setSavingName(true);
    try {
      const { user: u } = await api.updateProfile({ name: v });
      if (setUser) setUser(u);
      if (pushToast) pushToast("Nome de exibição atualizado.", "success");
    } catch (e) { if (pushToast) pushToast(e.message || "Não foi possível salvar o nome.", "info"); }
    finally { setSavingName(false); }
  };

  const savePassword = async () => {
    setPwErr("");
    if (pw.next.length < 8) return setPwErr("A nova senha precisa de ao menos 8 caracteres.");
    if (pw.next !== pw.confirm) return setPwErr("A confirmação não bate com a nova senha.");
    if (pw.next === pw.current) return setPwErr("A nova senha precisa ser diferente da atual.");
    setSavingPw(true);
    try {
      await api.changePassword({ current: pw.current, next: pw.next });
      setPw({ current: "", next: "", confirm: "" });
      if (pushToast) pushToast("Senha alterada com sucesso.", "success");
    } catch (e) { setPwErr(e.message || "Não foi possível trocar a senha."); }
    finally { setSavingPw(false); }
  };

  const saveDefaults = () => {
    try { localStorage.setItem(bioKeyFor(user?.email), bio); } catch { /* ignore */ }
    if (pushToast) pushToast("Padrão da proposta salvo.", "success");
  };
  const manageBilling = async () => {
    try { const { url } = await api.billingPortal(); window.location.href = url; }
    catch { if (go) go("pricing"); }
  };
  const logout = () => { setToken(null); if (go) go("landing"); };

  const plan = user?.plan || "free";
  const planLabel = { free: "Grátis (sem assinatura)", basic: "Básico", pro: "Pro", business: "Business" }[plan] || plan;
  const k = stats?.kpis;

  const card = { background: "#fff", border: `1px solid ${color.line2}`, borderRadius: 14, padding: "22px 24px" };
  const hTitle = { fontFamily: font.heading, fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em", marginBottom: 4 };
  const subTxt = { fontSize: "13.5px", color: color.gray500, margin: "0 0 18px" };
  const fieldLabel = { fontSize: 13, fontWeight: 600, color: color.gray700, display: "block", marginBottom: 6 };
  const pwPatch = (key) => (e) => setPw((p) => ({ ...p, [key]: e.target.value }));
  const nameDirty = name.trim() && name.trim() !== (user?.name || "");
  const Stat = ({ label, value, tint }) => (
    <div style={{ background: color.surface3, borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: color.gray400, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 24, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: tint || color.ink }}>{value}</div>
    </div>
  );

  return (
    <div className="db-pad" style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 27, letterSpacing: "-0.02em", margin: "0 0 4px" }}>Configurações</h1>
        <p style={{ fontSize: "14.5px", color: color.gray500, margin: 0 }}>Sua conta, segurança e seus números.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={card}>
          <div style={hTitle}>Perfil</div>
          <p style={subTxt}>Seu nome de exibição e email.</p>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
            <span style={{ width: 44, height: 44, flex: "none", borderRadius: "50%", background: color.accentTint, color: color.accentInk, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.heading, fontWeight: 700, fontSize: 16 }}>
              {user ? initials(user.name) : <User size={20} strokeWidth={2} />}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, color: color.gray400 }}>Email</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{user?.email || "Não conectado"}</div>
            </div>
          </div>
          <label style={fieldLabel}>Nome de exibição</label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Seu nome" style={{ ...inp(), flex: 1, minWidth: 200 }} />
            <button onClick={saveName} disabled={!nameDirty || savingName} className="db-btn db-btn-dark" style={{ fontSize: 14, padding: "0 18px" }}>{savingName ? "Salvando…" : "Salvar"}</button>
          </div>
        </div>

        <div style={card}>
          <div style={hTitle}>Segurança</div>
          <p style={subTxt}>Troque sua senha. Pedimos a atual para confirmar que é você.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 380 }}>
            <div>
              <label style={fieldLabel}>Senha atual</label>
              <input type={showPw ? "text" : "password"} value={pw.current} onChange={pwPatch("current")} autoComplete="current-password" placeholder="••••••••" style={inp()} />
            </div>
            <div>
              <label style={fieldLabel}>Nova senha</label>
              <input type={showPw ? "text" : "password"} value={pw.next} onChange={pwPatch("next")} autoComplete="new-password" placeholder="Ao menos 8 caracteres" style={inp()} />
            </div>
            <div>
              <label style={fieldLabel}>Confirmar nova senha</label>
              <input type={showPw ? "text" : "password"} value={pw.confirm} onChange={pwPatch("confirm")} autoComplete="new-password" placeholder="Repita a nova senha" style={inp()} />
            </div>
            <button type="button" onClick={() => setShowPw((v) => !v)} className="db-btn" style={{ alignSelf: "flex-start", background: "none", color: color.gray500, fontSize: 12.5, padding: "2px 4px", gap: 6 }}>
              <Eye size={14} strokeWidth={2} />{showPw ? "Ocultar senhas" : "Mostrar senhas"}
            </button>
            {pwErr && <div role="alert" style={{ fontSize: 13, color: "#B4443C", background: "#FDECEA", border: "1px solid #F5D2CD", padding: "9px 11px", borderRadius: 9 }}>{pwErr}</div>}
            <button onClick={savePassword} disabled={savingPw || !pw.current || !pw.next} className="db-btn db-btn-dark" style={{ alignSelf: "flex-start", fontSize: 14, padding: "10px 18px" }}><Lock size={14} strokeWidth={2.2} />{savingPw ? "Trocando…" : "Trocar senha"}</button>
          </div>
        </div>

        <div style={card}>
          <div style={hTitle}>Seus números</div>
          <p style={subTxt}>Um resumo das suas propostas.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            <Stat label="Propostas enviadas" value={k ? k.enviadas : "—"} />
            <Stat label="Aceitas" value={k ? k.aceitas : "—"} tint="#2E7D51" />
            <Stat label="Conversão" value={k ? `${k.conversao}%` : "—"} />
            <Stat label="Receita do mês" value={k ? brl(k.receita) : "—"} tint="#2E7D51" />
            <Stat label="Em aberto" value={k ? brl(k.emAberto) : "—"} />
          </div>
        </div>

        <div style={card}>
          <div style={hTitle}>Plano e cobrança</div>
          <p style={subTxt}>Seu plano atual e a gestão da assinatura.</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: color.accentInk, background: color.accentTint, border: `1px solid ${color.accentLine}`, padding: "6px 12px", borderRadius: 999 }}>{planLabel}</span>
            {plan === "free"
              ? <button onClick={() => go && go("pricing")} className="db-btn db-btn-accent" style={{ fontSize: 14, padding: "10px 18px" }}>Ver planos</button>
              : <button onClick={manageBilling} className="db-btn db-btn-ghost" style={{ fontSize: 14, padding: "10px 18px" }}>Gerenciar assinatura</button>}
          </div>
        </div>

        <div style={card}>
          <div style={hTitle}>Padrões da proposta</div>
          <p style={subTxt}>Preenchido automaticamente em cada proposta nova.</p>
          <label style={fieldLabel}>Sobre mim (padrão)</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={LIMITS.bio} rows={3} placeholder="Uma breve apresentação sua, usada em toda proposta." style={{ ...inp(), resize: "vertical", lineHeight: 1.5 }} />
          <div style={{ marginTop: 16 }}>
            <button onClick={saveDefaults} className="db-btn db-btn-dark" style={{ fontSize: 14, padding: "10px 18px" }}>Salvar padrão</button>
          </div>
        </div>

        <div style={card}>
          <div style={hTitle}>Sessão</div>
          <p style={subTxt}>Encerra sua sessão neste dispositivo.</p>
          <button onClick={logout} className="db-btn db-btn-ghost" style={{ fontSize: 14, padding: "10px 18px" }}><LogOut size={15} strokeWidth={2} />Sair da conta</button>
        </div>
      </div>
    </div>
  );
}
