import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Plus, FileText, LayoutGrid, Users, Settings, ArrowLeft, Image as ImageIcon,
  Trash2, Search, LogOut, User, Link2, Mail, Pencil, Check, AlertTriangle, X,
  Bell, Eye, EyeOff, Clock, Lock, Calendar, RotateCcw, Download, Calculator, Sparkles, LifeBuoy, ChevronRight, ChevronDown,
  Copy, Send, GripVertical, Home as HomeIcon,
} from "lucide-react";
import { font, color, statusColors, avatarPalette, brl, initials, shadow } from "../theme.js";
import HomePage from "./Home.jsx";
import { api, setToken } from "../lib/api.js";
import { loadProposals, upsertProposal, removeProposal, newId } from "../lib/drafts.js";
import { loadNotifs, mergeNotifs, getSeen, getReadSet, markRead, removeNotifs } from "../lib/notifs.js";
import { DESIGNS, ProposalDesign, sampleFor } from "../templates/designs.jsx";
import CodeInput from "../components/CodeInput.jsx";
import SupportChat, { SupportPage } from "../components/SupportChat.jsx";
import { PRICE_TABLE, COMPLEXITY, URGENCY, suggest, fmtBRL, DEFAULT_CONSUMO, PROJECT_DIFFICULTY } from "../lib/pricing.js";

// Versão do app (injetada pelo Vite a partir do package.json).
const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "";

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
  accent: "#0A0A0A", accent2: "#6C48B0", gradient: false, theme: "claro", watermark: "", logo: null, cover: null, template: "minimal",
};

const MAX_ITEMS = 20;
const STATUS_OPTIONS = ["Rascunho", "Enviada", "Visualizada", "Aceita", "Recusada"];

// Cores de atalho — o usuário também pode escolher QUALQUER cor no seletor.
const PRESET_COLORS = ["#D97757", "#E0A100", "#C6407E", "#9B2C3A", "#6C48B0", "#4F46E5", "#3A5BB5", "#0E7C86", "#2E7D51", "#0A0A0A"];

// Limites de caracteres por campo (sempre <= aos do backend, para não falhar no salvamento).
const LIMITS = {
  client: 80, company: 80, title: 120, scope: 8000, itemDesc: 300, itemValue: 12,
  start: 60, end: 60, payment: 500, revisions: 200, validity: 60, bio: 2000,
};

// Chaves do localStorage escopadas por usuário (evita vazar entre contas no mesmo navegador).
const ONB_KEY = "manda_onboarding";
const scoped = (base, email) => `${base}:${email || "anon"}`;
function loadOnb(email) { try { return JSON.parse(localStorage.getItem(scoped(ONB_KEY, email)) || "{}") || {}; } catch { return {}; } }
function saveOnb(email, o) { try { localStorage.setItem(scoped(ONB_KEY, email), JSON.stringify(o)); } catch { /* ignore */ } }
const bioKeyFor = (email) => scoped("manda_default_bio", email);
// Preferência: pop-ups (toasts) quando o cliente interage. Padrão: ligado.
const toastPrefKey = (email) => scoped("manda_pref_toasts", email);
// Perfil de custos da calculadora (ferramentas, hora, margem): estável por usuário.
const calcProfileKey = (email) => scoped("manda_calc_profile", email);
// Templates cujo selo "Novo" o usuário já dispensou (some ao clicar).
const tplSeenKey = (email) => scoped("manda_tpl_seen", email);
const toastsEnabled = (email) => { try { return localStorage.getItem(toastPrefKey(email)) !== "off"; } catch { return true; } };

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
  bio: p.bio, accent: p.accent, accent2: p.accent2 || "#6C48B0", gradient: !!p.gradient, theme: p.theme || "claro", watermark: p.watermark || "",
  logo: p.logo || null, cover: p.cover || null, template: p.template, createdAt: p.createdAt,
});

const STEPS = [
  "Organizando cada detalhe da sua proposta",
  "Deixando com cara de agência",
  "Somando o investimento",
  "Gerando seu link exclusivo",
];

export default function Dashboard({ go }) {
  // Aba ↔ URL: recarregar a página mantém a aba, e voltar/avançar do navegador
  // navega entre abas. O editor fica fora da URL (estado de trabalho, não página).
  // A Home é a tela inicial (base /app, sem slug). A lista de propostas ganhou a
  // aba própria "propostas".
  const TAB_TO_VIEW = { propostas: "list", templates: "templates", calculadora: "calc", clientes: "clients", notificacoes: "notifications", configuracoes: "settings", suporte: "support" };
  const VIEW_TO_TAB = { list: "propostas", templates: "templates", calc: "calculadora", clients: "clientes", notifications: "notificacoes", settings: "configuracoes", support: "suporte" };
  const { tab: urlTab } = useParams();
  const navigate = useNavigate();
  const [view, setView] = useState(() => TAB_TO_VIEW[urlTab || ""] || "home");

  // URL mudou (voltar/avançar): segue, exceto se estiver no meio de uma edição.
  useEffect(() => {
    const v = TAB_TO_VIEW[urlTab || ""] || "home";
    setView((cur) => (cur === "editor" || cur === v ? cur : v));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTab]);

  // Aba mudou: reflete na URL (o editor não mexe nela).
  useEffect(() => {
    if (view === "editor") return;
    const slug = VIEW_TO_TAB[view];
    const path = slug ? `/app/${slug}` : "/app";
    if (window.location.pathname !== path) navigate(path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);
  const [filter, setFilter] = useState("Todas");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState(() => loadProposals());
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true); // 1ª carga (com retry) ainda em andamento
  const [doc, setDoc] = useState(BLANK_DOC);
  const [draftId, setDraftId] = useState(null);
  const pristineRef = useRef("");  // snapshot do doc ao abrir; só salva rascunho se mudar
  const [editorFrom, setEditorFrom] = useState("list"); // aba de onde o editor foi aberto
  const [isCopy, setIsCopy] = useState(false); // editor aberto a partir de uma duplicação
  const [dragItem, setDragItem] = useState(null); // índice do item sendo arrastado
  const [overItem, setOverItem] = useState(null); // índice sob o cursor durante o arraste
  const [flow, setFlow] = useState("editing"); // editing | finishing | done
  const [step, setStep] = useState(0);
  const [sealing, setSealing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [showPreview, setShowPreview] = useState(true); // toggle do painel de pré-visualização
  const [profileMenu, setProfileMenu] = useState(false); // dropdown do perfil (topo da sidebar)
  const [onb, setOnb] = useState({});                   // progresso do tutorial (carregado por usuário)
  const [onbLoaded, setOnbLoaded] = useState(false);    // só persiste/mostra DEPOIS de carregar o salvo
  const [onbCelebrate, setOnbCelebrate] = useState(false); // banner "Tudo pronto" (7s, só em memória)
  const [showPlans, setShowPlans] = useState(false);    // modal de planos (assinar)
  const plansAutoShown = useRef(false);

  // Conta sem plano ativo (nunca assinou ou pagamento caducou e o reconciliador
  // bloqueou): já abre os planos uma vez, sem esperar a pessoa tentar criar.
  useEffect(() => {
    if (user && user.plan === "free" && !plansAutoShown.current) {
      plansAutoShown.current = true;
      setShowPlans(true);
    }
  }, [user]);
  const [intro, setIntro] = useState(() => { try { return sessionStorage.getItem("manda_entering") === "1"; } catch { return false; } });
  const [billingMsg, setBillingMsg] = useState(null);
  const [draftPublicId, setDraftPublicId] = useState(null); // link público da proposta em edição
  const [sending, setSending] = useState(false);            // concluindo (salvando no servidor)
  const [flowError, setFlowError] = useState("");           // erro ao concluir (ex: limite do plano)
  const [emailState, setEmailState] = useState("idle");     // idle | sending | sent | connect | error (envio da proposta por e-mail)
  const [emailNote, setEmailNote] = useState("");           // mensagem sob o campo de e-mail
  const [toasts, setToasts] = useState([]);                 // pop-ups que somem após 4s
  const [notifs, setNotifs] = useState([]);                 // notificações (localStorage, por usuário)
  const [notifRead, setNotifRead] = useState(new Set());    // ids lidos (por usuário)
  const firstNotifPoll = useRef(true);                      // evita "chuva" de toasts na 1ª carga

  // Pop-up efêmero (some sozinho em 4 segundos).
  const pushToast = (msg, kind = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  };
  // Lida/não lida e exclusão (persistem no localStorage do usuário).
  const notifSetRead = (ids, read) => setNotifRead(new Set(markRead(user?.email, ids, read)));
  const notifDelete = (ids) => setNotifs(removeNotifs(user?.email, ids));

  const [serverDown, setServerDown] = useState(false);
  const [usage, setUsage] = useState({ used: 0, limit: 0 }); // uso do mês x limite (do backend)

  // Uso do mês (append-only no servidor): NÃO diminui ao apagar propostas.
  const refreshUsage = () => { api.usage().then(setUsage).catch(() => {}); };

  // Follow-up assistido: propostas paradas que valem um lembrete (do servidor).
  const [followUps, setFollowUps] = useState([]);
  const [remindingId, setRemindingId] = useState(null);
  const refreshFollowUps = () => { api.followUps().then((d) => setFollowUps(d.followUps || [])).catch(() => {}); };

  // Recarrega a lista: propostas do servidor + rascunhos locais (localStorage).
  const refreshRows = async () => {
    const local = loadProposals();
    try {
      const { proposals } = await api.listProposals();
      setRows([...local, ...proposals.map(fromApi)]);
      setServerDown(false);
      refreshFollowUps();
    } catch (e) {
      setRows(local); // backend fora do ar: mostra ao menos os rascunhos locais
      if (e?.network) setServerDown(true);
    }
  };

  // Busca novas notificações sob demanda (usado pelo botão de recarregar).
  const refreshNotifs = async () => {
    if (!user) return;
    try {
      const { notifications } = await api.notifications();
      const { list } = mergeNotifs(user.email, notifications);
      setNotifs(list);
    } catch { /* ignore */ }
  };

  // Carga inicial com RETRY. Num reload rápido, a primeira chamada pode falhar
  // (rede oscilando, servidor acordando) e antes ela era engolida em silêncio:
  // perfil ficava "não conectado" e propostas do servidor sumiam até um F5.
  // Agora tenta de novo em 0,7s / 1,5s / 3s antes de assumir que está fora.
  useEffect(() => {
    let alive = true;
    const attempt = async (n = 0) => {
      if (!alive) return;
      try {
        const [{ user: u }, { proposals }] = await Promise.all([api.me(), api.listProposals()]);
        if (!alive) return;
        setUser(u);
        setRows([...loadProposals(), ...proposals.map(fromApi)]);
        setServerDown(false);
        setBooting(false);
        refreshUsage();
        refreshFollowUps();
      } catch (e) {
        if (!alive) return;
        if (n < 3) { setTimeout(() => attempt(n + 1), [700, 1500, 3000][n]); return; }
        setBooting(false);
        setRows(loadProposals()); // ao menos os rascunhos locais
        if (e?.network) setServerDown(true);
      }
    };
    attempt();
    return () => { alive = false; };
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
    setOnbLoaded(false);
    setOnbCelebrate(false);
    setOnb(loadOnb(scope));
    setOnbLoaded(true);
    const list = loadNotifs(scope);
    setNotifs(list);
    // Migração: no modelo antigo, "lida" era uma marca d'água por data.
    // Converte uma vez para o modelo por id e segue só com ele.
    const legacySeen = getSeen(scope);
    const rs = getReadSet(scope);
    const legacyIds = legacySeen ? list.filter((n) => new Date(n.createdAt).getTime() <= legacySeen && !rs.has(n.id)).map((n) => n.id) : [];
    setNotifRead(legacyIds.length ? new Set(markRead(scope, legacyIds)) : rs);
    firstNotifPoll.current = true;

    let alive = true;
    const load = async () => {
      try {
        const { notifications } = await api.notifications();
        if (!alive) return;
        const { list, added } = mergeNotifs(scope, notifications);
        setNotifs(list);
        if (!firstNotifPoll.current && toastsEnabled(scope)) added.forEach((n) => pushToast(notifLabel(n)));
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
  const concluiuAlguma = usage.used > 0; // append-only: não some ao apagar propostas
  const onbSteps = {
    create: onbActive && (!!onb.create || concluiuAlguma || rows.length > 0),
    send: onbActive && (!!onb.send || concluiuAlguma || rows.some((r) => r.status && r.status !== "Rascunho")),
    profile: onbActive && (!!onb.profile || onbBioSet),
  };
  const onbDone = onbSteps.create && onbSteps.send && onbSteps.profile;

  useEffect(() => {
    if (!onbActive || !onbLoaded) return; // nunca grava antes de carregar o estado salvo
    if (onb.hidden) return;               // dispensado: não há mais o que persistir
    // Só PROMOVE passos (false → true). Nunca rebaixa: dados da API ainda carregando
    // não podem apagar progresso já salvo.
    const merged = {
      ...onb,
      create: !!onb.create || onbSteps.create,
      send: !!onb.send || onbSteps.send,
      profile: !!onb.profile || onbSteps.profile,
    };
    if (merged.create === !!onb.create && merged.send === !!onb.send && merged.profile === !!onb.profile) return;
    saveOnb(user.email, merged);
    setOnb(merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onbSteps.create, onbSteps.send, onbSteps.profile, onbActive, onbLoaded, onb.hidden]);

  const dismissOnb = () => { const next = { ...onb, hidden: true }; saveOnb(user?.email, next); setOnb(next); };

  // Concluiu 100%? O card de sucesso some sozinho em 7s e fica escondido para sempre.
  // Concluiu 100%? Persiste o "some pra sempre" NA HORA (reload nunca mais mostra)
  // e celebra por 7s só em memória, nesta sessão.
  useEffect(() => {
    if (!onbActive || !onbLoaded || !onbDone || onb.hidden) return;
    dismissOnb();
    setOnbCelebrate(true);
    const t = setTimeout(() => setOnbCelebrate(false), 7000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onbActive, onbLoaded, onbDone, onb.hidden]);

  // Retorno do checkout do Mercado Pago (?assinatura=ok|pendente|cancelada|erro).
  // O plano é liberado pelo WEBHOOK, que costuma chegar 1-2s depois do redirect.
  // Por isso, em vez de checar uma vez só, fazemos um polling curto: a conta
  // atualiza sozinha assim que o pagamento é confirmado, sem recarregar a página.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("assinatura");
    if (!p) return;
    window.history.replaceState({}, "", "/app");

    if (p === "cancelada" || p === "erro") {
      setBillingMsg({ ok: false, text: "Pagamento não concluído. Pode tentar de novo quando quiser." });
      return;
    }

    setBillingMsg({ ok: true, text: p === "pendente"
      ? "Recebemos seu pedido. Assim que o pagamento for confirmado (o Pix pode levar alguns instantes), seu plano é liberado."
      : "Pagamento recebido! Estamos liberando seu plano…" });

    let tries = 0;
    let stop = false;
    const poll = async () => {
      if (stop) return;
      tries++;
      try {
        const r = await api.me();
        setUser(r.user);
        if (r.user?.plan && r.user.plan !== "free") {
          setBillingMsg({ ok: true, text: "Plano ativado! Tudo pronto pra mandar propostas." });
          refreshUsage();
          return; // liberou: encerra o polling
        }
      } catch { /* ignora e tenta de novo */ }
      if (tries < 8) setTimeout(poll, 2000); // ~16s de tentativas
    };
    poll();
    return () => { stop = true; };
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

  // Clientes conhecidos (de todas as propostas) para o autocomplete do editor.
  // Escolher um preenche empresa e email, mantendo o vínculo consistente:
  // as propostas do mesmo cliente se agrupam pelo email (ou nome) em Clientes.
  const normClient = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
  const knownClients = useMemo(() => {
    const m = {};
    rows.forEach((r) => {
      const key = String(r.clientEmail || "").trim().toLowerCase() || normClient(r.client);
      if (!key) return;
      if (!m[key]) m[key] = { name: (r.client || "").trim(), company: r.company || "", email: r.clientEmail || "" };
      else {
        if (!m[key].company && r.company) m[key].company = r.company;
        if (!m[key].email && r.clientEmail) m[key].email = r.clientEmail;
      }
    });
    return Object.values(m).filter((c) => c.name);
  }, [rows]);
  const pickClient = (e) => {
    const v = e.target.value;
    const hit = knownClients.find((c) => normClient(c.name) === normClient(v));
    setDoc((d) => ({
      ...d,
      client: v,
      company: d.company || (hit ? hit.company : ""),
      clientEmail: d.clientEmail || (hit ? hit.email : ""),
    }));
  };
  const updItem = (i, key) => (e) => {
    let v = e.target.value;
    if (key === "value") v = v.replace(/[^0-9]/g, "");
    setDoc((d) => ({ ...d, items: d.items.map((it, idx) => (idx === i ? { ...it, [key]: v } : it)) }));
  };
  const addItem = () => setDoc((d) => (d.items.length >= MAX_ITEMS ? d : { ...d, items: [...d.items, { desc: "", value: "" }] }));
  const toggleItemHidden = (i) => setDoc((d) => ({ ...d, items: d.items.map((it, idx) => (idx === i ? { ...it, hidden: !it.hidden } : it)) }));
  // Reordena os itens: a ordem do array é a ordem que aparece na proposta e no PDF.
  const moveItem = (from, to) => setDoc((d) => {
    if (from == null || to < 0 || to >= d.items.length || from === to) return d;
    const items = d.items.slice();
    const [m] = items.splice(from, 1);
    items.splice(to, 0, m);
    return { ...d, items };
  });

  // Calculadora de preço. Insere um item novo (ou preenche o último vazio) com a
  // descrição do serviço e o valor sugerido escolhido.
  const [showCalc, setShowCalc] = useState(false);
  const applyPrice = (desc, value, list) => {
    setDoc((d) => {
      let items = [...d.items];
      // Descarta a última linha se estiver vazia (não duplica um item em branco).
      const last = items[items.length - 1];
      if (items.length && !String(last.desc || "").trim() && !String(last.value || "").trim()) items = items.slice(0, -1);
      const incoming = (list && list.length) ? list : [{ desc, value: String(value) }];
      items = [...items, ...incoming].slice(0, MAX_ITEMS);
      if (!items.length) items = [{ desc: "", value: "" }];
      return { ...d, items };
    });
    setShowCalc(false);
  };
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

  // Gera um PDF a partir do próprio design da proposta (o mesmo que o cliente vê).
  const pdfRef = useRef(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const downloadPdf = async () => {
    if (!pdfRef.current || pdfBusy) return;
    setPdfBusy(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const canvas = await html2canvas(pdfRef.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pw) / canvas.width;
      let left = imgH;
      let pos = 0;
      pdf.addImage(img, "PNG", 0, pos, pw, imgH);
      left -= ph;
      while (left > 0) { pos -= ph; pdf.addPage(); pdf.addImage(img, "PNG", 0, pos, pw, imgH); left -= ph; }
      const name = String(doc.client || doc.title || "proposta").replace(/[^\w\s-]/g, "").trim().slice(0, 40) || "proposta";
      pdf.save(`proposta-${name}.pdf`);
      pushToast("PDF gerado.", "success");
    } catch {
      pushToast("Não foi possível gerar o PDF. Rode: npm install html2canvas jspdf", "info");
    } finally {
      setPdfBusy(false);
    }
  };
  // Envia a proposta pelo GMAIL do usuário (via backend). Requer proposta já
  // concluída (tem id no servidor) e conta Google conectada em Configurações.
  const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  const sendByEmail = async () => {
    // Guard anti-spam: ignora cliques enquanto envia ou depois de já enviado.
    if (emailState === "sending" || emailState === "sent") return;
    const to = String(doc.clientEmail || "").trim();
    if (!emailRe.test(to)) { setEmailState("error"); setEmailNote("Digite um e-mail válido para o cliente."); return; }
    if (!draftId || isLocalId(draftId)) { setEmailState("error"); setEmailNote("Conclua a proposta antes de enviar."); return; }
    setEmailState("sending"); setEmailNote("");
    try {
      const res = await api.sendProposalEmail(draftId, { to });
      setEmailState("sent");
      setEmailNote(`Enviado de ${res.from || "seu e-mail"} para ${res.to}.`);
      pushToast("Proposta enviada por e-mail.", "success");
    } catch (err) {
      if (err.data?.alreadySent) {
        // Já foi enviada antes: trava como "enviado", sem reenviar.
        setEmailState("sent");
        setEmailNote("Esta proposta já foi enviada ao cliente.");
      } else if (err.needsConnect || /conect|gmail|google/i.test(err.message || "")) {
        setEmailState("connect");
        setEmailNote("Conecte seu Gmail em Configurações para enviar pelo seu e-mail.");
      } else {
        setEmailState("error");
        setEmailNote(err.message || "Não foi possível enviar agora.");
      }
    }
  };

  const total = doc.items.reduce((a, it) => a + (it.hidden ? 0 : parseInt(it.value, 10) || 0), 0);
  const itemCount = doc.items.filter((it) => !it.hidden && (it.desc || it.value)).length;
  const hasContent = doc.client || doc.company || doc.title || doc.scope || doc.start || doc.end ||
    doc.payment || doc.revisions || doc.validity || doc.bio || doc.items.some((it) => it.desc || it.value);
  const canFinish = doc.client.trim() !== "" && doc.title.trim() !== "";

  // Templates travados por plano (espelha a regra do backend). Básico só tem
  // minimal e bold; Pro/Business e admin têm todos. Admin entra como business.
  const planTier = user?.role === "admin" ? "business" : (user?.plan || "free");
  const tplLocked = (id) => ["free", "basic"].includes(planTier) && !BASIC_TPL_IDS.includes(id);

  // Corpo enviado à API (formato do proposalSchema do backend).
  const toApiBody = () => ({
    client: doc.client, company: doc.company, clientEmail: doc.clientEmail,
    title: doc.title, scope: doc.scope,
    items: doc.items.filter((it) => it.desc || it.value).map((it) => ({ desc: it.desc || "", value: String(it.value || ""), hidden: !!it.hidden })),
    start: doc.start, end: doc.end, payment: doc.payment, revisions: doc.revisions,
    validity: doc.validity, bio: doc.bio, accent: doc.accent, accent2: doc.accent2, gradient: !!doc.gradient, theme: doc.theme || "claro", watermark: doc.watermark || "",
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
    const d = { ...BLANK_DOC, bio };
    setDoc(d);
    pristineRef.current = JSON.stringify(d); // abriu em branco: só vira rascunho se editar
    setDraftId(newId());
    setDraftPublicId(null);
    setEditorFrom("list");
    setFlowError("");
    setFlow("editing");
    setIsCopy(false);
    setView("editor");
  };
  // Abre uma proposta nova já com os itens vindos da Calculadora.
  const startProposalWithItem = (desc, value, list) => {
    let bio = "";
    try { bio = localStorage.getItem(bioKeyFor(user?.email)) || ""; } catch { /* ignore */ }
    const items = (list && list.length) ? list.slice(0, MAX_ITEMS) : [{ desc, value: String(value) }];
    setDoc({ ...BLANK_DOC, bio, items });
    pristineRef.current = ""; // veio da calculadora com valores: já conta como conteúdo
    setDraftId(newId());
    setDraftPublicId(null);
    setEditorFrom("calc");
    setFlowError("");
    setFlow("editing");
    setIsCopy(false);
    setView("editor");
  };
  const openRow = async (r) => {
    // A lista traz só o resumo; ao abrir uma proposta do servidor, busca o
    // conteúdo completo (rascunho local já vem completo). Menos egress no dia a dia.
    let src = r;
    if (r.id && !isLocalId(r.id) && r.scope === undefined) {
      try { const { proposal } = await api.getProposal(r.id); src = { ...r, ...fromApi(proposal) }; }
      catch { pushToast("Não foi possível carregar a proposta. Tente de novo.", "info"); return; }
    }
    const d = {
      ...BLANK_DOC,
      client: src.client || "", company: src.company || "", title: src.title === "Proposta sem título" ? "" : (src.title || ""),
      clientEmail: src.clientEmail || "", scope: src.scope || "",
      items: Array.isArray(src.items) && src.items.length ? src.items : BLANK_DOC.items,
      start: src.start || "", end: src.end || "", payment: src.payment || "",
      revisions: src.revisions || "", validity: src.validity || "", bio: src.bio || "",
      accent: src.accent || "#0A0A0A", accent2: src.accent2 || "#6C48B0", gradient: !!src.gradient, theme: src.theme || "claro", watermark: src.watermark || "", logo: src.logo || null, cover: src.cover || null, template: src.template || "minimal",
    };
    setDoc(d);
    pristineRef.current = JSON.stringify(d); // abriu uma existente: só re-salva se editar
    setDraftId(src.id || newId());
    setDraftPublicId(src.publicId || null);
    setIsCopy(false);
    setEditorFrom("list");
    setFlowError("");
    setFlow("editing");
    setView("editor");
  };
  const onRowKey = (r) => (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openRow(r); } };

  const navTo = async (v) => {
    // Salva rascunho local só se HOUVE mudança desde a abertura. Abrir uma
    // proposta e sair sem mexer não cria (nem duplica) rascunho.
    const changed = JSON.stringify(doc) !== pristineRef.current;
    if (view === "editor" && flow !== "done" && changed && hasContent && (!draftId || isLocalId(draftId))) {
      upsertProposal(buildLocalDraft());
      await refreshRows();
    }
    setFlowError("");
    setFlow("editing");
    setView(v);
  };
  const exitEditor = () => navTo(editorFrom);

  // Limpar todos os campos da proposta (mantém o modelo e as cores escolhidas).
  // Dois cliques pra confirmar, já que apaga tudo que foi digitado.
  const [clearArm, setClearArm] = useState(false);
  const clearFields = () => {
    setDoc((d) => ({ ...BLANK_DOC, template: d.template, accent: d.accent, accent2: d.accent2, gradient: d.gradient }));
    pushToast("Campos limpos.", "info");
  };
  const clearFieldsClick = () => {
    if (clearArm) { clearFields(); setClearArm(false); return; }
    setClearArm(true);
    setTimeout(() => setClearArm(false), 3000);
  };

  // Clicar num campo da prévia foca o input correspondente no editor.
  const focusField = (field) => {
    const id = { title: "ed-title", client: "ed-client", scope: "ed-scope", bio: "ed-bio", items: "ed-item0" }[field];
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => el.focus({ preventScroll: true }), 120);
  };

  const startWithDesign = (id) => {
    let bio = "";
    try { bio = localStorage.getItem(bioKeyFor(user?.email)) || ""; } catch { /* ignore */ }
    const d = { ...BLANK_DOC, template: id, bio };
    setDoc(d);
    pristineRef.current = JSON.stringify(d); // escolheu um template em branco: idem
    setDraftId(newId());
    setDraftPublicId(null);
    setEditorFrom("templates");
    setFlowError("");
    setFlow("editing");
    setIsCopy(false);
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
      // Sobe pro disco do servidor e guarda só a URL (não o base64 no banco).
      const { url } = await api.uploadImage(dataUrl);
      setDoc((d) => ({ ...d, [key]: url }));
    } catch (err) {
      pushToast(err?.message || "Não foi possível enviar a imagem.", "info");
    }
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
      setEmailState("idle");
      setEmailNote("");
      await refreshRows();
      refreshUsage();
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

  // Duplicar: abre uma CÓPIA como rascunho local editável (novo id local, sem
  // link público). Nada vai pro servidor nem conta cota até você concluir. Assim
  // a cópia não nasce travada como as propostas já enviadas.
  const duplicateRow = (r) => async (e) => {
    e.stopPropagation();
    // Busca o conteúdo completo (a lista só tem o resumo) antes de copiar.
    let src = r;
    if (r.id && !isLocalId(r.id) && r.scope === undefined) {
      try { const { proposal } = await api.getProposal(r.id); src = { ...r, ...fromApi(proposal) }; }
      catch { pushToast("Não foi possível carregar a proposta pra duplicar.", "info"); return; }
    }
    const baseTitle = src.title && src.title !== "Proposta sem título" ? src.title : "Proposta";
    const d = {
      ...BLANK_DOC,
      client: src.client || "", company: src.company || "", title: `${baseTitle} (cópia)`,
      clientEmail: src.clientEmail || "", scope: src.scope || "",
      items: Array.isArray(src.items) && src.items.length ? src.items.map((it) => ({ ...it })) : BLANK_DOC.items,
      start: src.start || "", end: src.end || "", payment: src.payment || "",
      revisions: src.revisions || "", validity: src.validity || "", bio: src.bio || "",
      accent: src.accent || "#0A0A0A", accent2: src.accent2 || "#6C48B0", gradient: !!src.gradient,
      theme: src.theme || "claro", watermark: src.watermark || "", logo: src.logo || null, cover: src.cover || null,
      template: src.template || "minimal",
    };
    setDoc(d);
    pristineRef.current = ""; // cópia já tem conteúdo: conta como rascunho
    setDraftId(newId());
    setDraftPublicId(null);
    setEditorFrom("list");
    setFlowError("");
    setFlow("editing");
    setIsCopy(true);
    setView("editor");
    pushToast("Cópia aberta como rascunho. Ajuste e conclua.", "success");
  };

  // Follow-up assistido: envia o lembrete pelo Gmail do usuário (clique dele).
  const remind = async (f) => {
    if (remindingId) return;
    setRemindingId(f.id);
    try {
      await api.remindProposal(f.id);
      pushToast(`Lembrete enviado para ${f.client || "o cliente"}.`, "success");
      refreshFollowUps();
    } catch (err) {
      if (err.needsConnect) pushToast("Conecte seu Gmail em Configurações para enviar lembretes.", "info");
      else pushToast(err.message || "Não foi possível enviar o lembrete.", "info");
    }
    setRemindingId(null);
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
  // Proposta concluída (id do servidor) é imutável — não pode ser editada nem reenviada.
  const locked = view === "editor" && !!draftId && !isLocalId(draftId);

  const labelStyle = { fontSize: 13, fontWeight: 600, color: color.gray700 };
  const sectionLabel = { fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: color.gray400, marginBottom: 10 };
  const pvSection = { fontSize: "11.5px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: color.gray400, marginBottom: 8 };

  const unread = notifs.filter((n) => !notifRead.has(n.id)).length;

  // Nav em dois grupos (como na referência): o uso do dia a dia em cima e, sob o
  // rótulo "Preferências", as telas de ajuste.
  const navMain = [
    { key: "home", label: "Início", Icon: HomeIcon },
    { key: "list", label: "Propostas", Icon: FileText },
    { key: "templates", label: "Templates", Icon: LayoutGrid },
    { key: "calc", label: "Calculadora", Icon: Calculator },
    { key: "clients", label: "Clientes", Icon: Users },
    { key: "notifications", label: "Notificações", Icon: Bell, badge: unread },
  ];
  const navPrefs = [
    { key: "settings", label: "Configurações", Icon: Settings },
    { key: "support", label: "Suporte", Icon: LifeBuoy },
  ];
  // Menu do perfil (topo da sidebar): abre com "Sair".
  const navItem = (n) => {
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
  };

  const profileName = user?.name || "Sua conta";
  // Propostas restantes: vêm do USO append-only do backend (não some ao apagar).
  const usageUnlimited = usage.limit == null; // null = ilimitado (Business)
  const remaining = usageUnlimited ? Infinity : Math.max(0, usage.limit - usage.used);
  const quotaLow = !!user && user.plan !== "free" && !usageUnlimited && remaining === 0;
  const profileSub = !user
    ? (booting ? "Carregando…" : "Não conectado")
    : user.plan === "free"
      ? "Sem plano ativo"
      : usageUnlimited
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
        .db-grip{ display:flex; align-items:center; justify-content:center; color:${color.gray300}; cursor:grab; border-radius:7px; transition:color .14s ease, background .14s ease; }
        .db-grip:hover{ color:${color.gray500}; background:${color.surface}; }
        .db-grip:active{ cursor:grabbing; }
        .db-grip:focus-visible{ outline:2px solid ${color.accent}; outline-offset:1px; color:${color.gray500}; }
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
        .db-profile{ display:flex; align-items:center; gap:11px; padding:8px 10px; width:100%; border:1px solid ${color.line2}; background:${color.white}; border-radius:11px; cursor:pointer; text-align:left; font-family:${font.body}; transition:background .14s ease, border-color .14s ease; }
        .db-profbtn:hover{ background:${color.surface3}; border-color:${color.gray300}; }
        .db-profbtn:focus-visible{ outline:2px solid ${color.accent}; outline-offset:2px; }
        .db-navlabel{ font-size:11px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:${color.gray400}; padding:14px 12px 6px; }
        .db-menuitem{ display:flex; align-items:center; gap:10px; width:100%; padding:9px 11px; border:none; background:none; border-radius:8px; font-family:${font.body}; font-size:13.5px; font-weight:500; color:${color.gray700}; cursor:pointer; text-align:left; transition:background .12s ease; }
        .db-menuitem:hover{ background:${color.surface}; color:${color.ink}; }

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
        /* Mobile: no passo ativo do onboarding, o botão desce pra baixo do texto em vez de espremer a coluna. */
        @media (max-width:560px){
          .db-onb-row{ flex-wrap:wrap; row-gap:12px; }
          .db-onb-cta{ width:100%; margin-left:39px; justify-content:center; }
        }
        .db-onb-step{ display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:11px; border:1px solid ${color.line2}; transition:background .15s ease, border-color .15s ease; }
        .db-onb-step.done{ border-color:transparent; background:${color.surface2}; }
        .db-onb-check{ width:22px; height:22px; flex:none; border-radius:50%; border:2px solid ${color.gray300}; display:flex; align-items:center; justify-content:center; color:#fff; transition:background .2s ease, border-color .2s ease; }
        .db-onb-check.on{ border-color:#2E7D51; background:#2E7D51; }
        .db-planbar{ display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; background:${color.accentTint}; border:1px solid ${color.accentLine}; border-radius:14px; padding:14px 18px; margin-bottom:18px; }
        .db-planbar-icon{ width:36px; height:36px; flex:none; border-radius:10px; background:#fff; color:${color.accentInk}; display:flex; align-items:center; justify-content:center; }
        .db-follow{ background:${color.surface2}; border:1px solid ${color.line}; border-radius:14px; padding:16px 18px; margin-bottom:18px; }
        .db-follow-head{ display:flex; align-items:flex-start; gap:12px; margin-bottom:12px; }
        .db-follow-ic{ width:34px; height:34px; flex:none; border-radius:9px; background:${color.accentTint}; color:${color.accentInk}; display:flex; align-items:center; justify-content:center; }
        .db-follow-t{ font-family:${font.heading}; font-weight:700; font-size:14.5px; letter-spacing:-0.01em; color:${color.ink}; }
        .db-follow-s{ font-size:12.5px; line-height:1.45; color:${color.gray500}; margin-top:1px; }
        .db-follow-list{ display:flex; flex-direction:column; gap:8px; }
        .db-follow-item{ display:flex; align-items:center; justify-content:space-between; gap:12px; background:#fff; border:1px solid ${color.line2}; border-radius:11px; padding:10px 12px; }
        .db-follow-info{ display:flex; flex-direction:column; min-width:0; }
        .db-follow-name{ font-size:13.5px; font-weight:600; color:${color.ink}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .db-follow-meta{ font-size:12px; color:${color.gray500}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .db-follow-btn{ display:inline-flex; align-items:center; gap:7px; flex:none; font-family:${font.body}; font-size:13px; font-weight:600; color:#fff; background:${color.ink}; border:none; border-radius:10px; padding:9px 14px; cursor:pointer; transition:background .15s ease, opacity .15s ease, transform .12s ease; }
        .db-follow-btn:hover:not(:disabled){ background:#262626; }
        .db-follow-btn:active:not(:disabled){ transform:scale(.97); }
        .db-follow-btn:disabled{ opacity:.55; cursor:default; }
        .db-plans-card{ position:relative; width:100%; max-width:820px; background:#fff; border:1px solid ${color.line}; border-radius:18px; box-shadow:0 30px 70px -22px rgba(20,20,30,0.35); padding:28px 28px 30px; max-height:92vh; overflow:auto; animation:dbPop .38s cubic-bezier(.2,.8,.2,1) both; }
        .db-plans-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
        .db-plan{ border-radius:14px; padding:22px 18px 20px; background:#fff; }
        @media (max-width:720px){ .db-plans-grid{ grid-template-columns:1fr; } }
        .db-dsn-grid{ display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:22px; }
        .db-dsn-card{ border:1px solid ${color.line2}; border-radius:14px; overflow:hidden; background:#fff; transition:box-shadow .16s ease, transform .16s ease, border-color .16s ease; }
        .db-dsn-card:hover{ box-shadow:0 20px 44px -20px rgba(20,20,30,0.3); transform:translateY(-4px); border-color:${color.gray200}; }
        .db-dsn-thumb{ position:relative; height:300px; overflow:hidden; background:${color.surface2}; border-bottom:1px solid ${color.line2}; }
        .db-dsn-thumb::after{ content:""; position:absolute; left:0; right:0; bottom:0; height:56px; background:linear-gradient(180deg, rgba(245,245,247,0) 0%, ${color.surface2} 96%); pointer-events:none; }
        .db-dsn-badges{ position:absolute; top:12px; left:12px; z-index:2; display:flex; gap:6px; }
        .db-dsn-badge{ font-size:10.5px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; border-radius:999px; padding:4px 9px; }
        .db-dsn-badge.novo{ color:#fff; background:${color.accent}; box-shadow:0 6px 14px -6px ${color.accent}99; }
        .db-dsn-badge.pro{ color:${color.ink900}; background:#fff; border:1px solid ${color.gray200}; }
        .db-dsn-hover{ position:absolute; inset:0; z-index:3; display:flex; align-items:center; justify-content:center; background:rgba(14,14,16,0.32); opacity:0; transition:opacity .18s ease; }
        .db-dsn-card:hover .db-dsn-hover{ opacity:1; }
        .db-dsn-cta{ font-size:14px; font-weight:700; color:${color.ink900}; background:#fff; padding:12px 20px; border-radius:11px; box-shadow:0 14px 34px -12px rgba(0,0,0,0.45); }
        .db-dsn-cta:hover{ background:${color.surface3}; }
        .db-dsn-chips{ display:flex; gap:8px; flex-wrap:wrap; margin-bottom:22px; }
        .db-dsn-chip{ display:inline-flex; align-items:center; gap:7px; font-family:${font.body}; font-size:13.5px; font-weight:600; color:${color.gray600}; background:#fff; border:1px solid ${color.gray200}; border-radius:999px; padding:8px 14px; cursor:pointer; transition:background .15s ease, border-color .15s ease, color .15s ease; }
        .db-dsn-chip:hover{ border-color:${color.gray300}; }
        .db-dsn-chip.on{ color:#fff; background:${color.ink}; border-color:${color.ink}; }
        .db-dsn-chip-n{ font-size:11px; font-weight:700; color:${color.gray400}; background:${color.surface}; border-radius:999px; padding:1px 7px; }
        .db-dsn-chip.on .db-dsn-chip-n{ color:#fff; background:rgba(255,255,255,0.18); }
        .db-dsn-chip:focus-visible{ outline:2px solid ${color.accent}; outline-offset:2px; }
        .db-swatch{ width:27px; height:27px; border:none; border-radius:50%; cursor:pointer; padding:0; display:inline-flex; align-items:center; justify-content:center; color:#fff; box-shadow:0 0 0 1px rgba(0,0,0,0.08); transition:transform .14s cubic-bezier(.2,.8,.2,1); }
        .db-swatch:hover{ transform:scale(1.18); }
        .db-swatch.on{ transform:scale(1.1); }
        .db-swatch svg{ filter:drop-shadow(0 1px 1.5px rgba(0,0,0,0.4)); animation:dbPop .25s ease both; }
        .db-swatch:focus-visible{ outline:2px solid ${color.ink}; outline-offset:2px; }
        /* botão de cor aleatória */
        .db-dice{ width:31px; height:31px; border-radius:9px; border:1px dashed ${color.gray300}; background:#fff; color:${color.gray500}; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; transition:transform .16s ease, border-color .16s ease, color .16s ease; }
        .db-dice:hover{ transform:rotate(-14deg) scale(1.05); border-color:${color.accent}; color:${color.accent}; }
        .db-dice:active{ transform:rotate(8deg) scale(.95); }
        /* pill do seletor de cor com chip vivo */
        .db-colorpill{ display:inline-flex; align-items:center; gap:9px; border:1px solid ${color.gray200}; border-radius:11px; padding:5px 12px 5px 6px; background:#fff; cursor:pointer; transition:border-color .15s ease, box-shadow .15s ease; }
        .db-colorpill:hover{ border-color:${color.gray300}; }
        .db-colorpill:focus-within{ border-color:${color.accent}; box-shadow:0 0 0 3px rgba(217,119,87,0.14); }
        .db-colorchip{ width:30px; height:30px; border-radius:8px; flex:none; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.12); position:relative; overflow:hidden; }
        .db-colorchip input{ position:absolute; inset:-6px; width:150%; height:150%; border:none; padding:0; background:none; cursor:pointer; }
        /* cartões de tema com mini prévia */
        .db-theme{ display:flex; flex-direction:column; gap:8px; align-items:stretch; width:100px; padding:0; background:none; border:none; cursor:pointer; }
        .db-theme-prev{ height:58px; border-radius:11px; overflow:hidden; border:1.5px solid ${color.gray200}; display:flex; flex-direction:column; transition:border-color .16s ease, box-shadow .16s ease, transform .16s ease; }
        .db-theme:hover .db-theme-prev{ transform:translateY(-3px); box-shadow:0 10px 22px -12px rgba(20,20,30,0.4); }
        .db-theme.on .db-theme-prev{ border-color:${color.ink}; box-shadow:0 0 0 3px rgba(24,24,27,0.13); }
        .db-theme-line{ height:5px; border-radius:99px; margin:0 10px; }
        .db-theme-name{ display:flex; align-items:center; justify-content:center; gap:6px; font-size:12.5px; font-weight:600; color:${color.gray500}; }
        .db-theme.on .db-theme-name{ color:${color.ink}; }
        .db-status-sel{ font-family:${font.body}; font-size:11.5px; font-weight:600; padding:3px 10px; border-radius:999px; cursor:pointer; outline:none; -webkit-appearance:none; appearance:none; max-width:100%; }
        .db-status-sel:focus-visible{ outline:2px solid ${color.accent}; outline-offset:1px; }
        .db-kpi-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:26px; }
        .db-cli-wrap{ overflow-x:auto; background:#fff; border:1px solid ${color.line2}; border-radius:14px; }
        .db-cli-head, .db-cli-row{ display:grid; grid-template-columns:minmax(200px,2fr) 110px 90px 90px 130px; column-gap:16px; align-items:center; padding:14px 20px; }
        .db-cli-head{ background:${color.surface3}; border-bottom:1px solid #EEE; font-size:11.5px; font-weight:600; letter-spacing:0.04em; text-transform:uppercase; color:${color.gray400}; }
        .db-cli-row{ border-top:1px solid #F3F3F3; transition:background .12s ease; }
        .db-cli-row:hover{ background:${color.surface3}; }
        .db-tip{ position:relative; cursor:help; }
        .db-tip::after{ content:attr(data-tip); position:absolute; bottom:calc(100% + 7px); right:0; background:${color.ink}; color:#fff; font-size:11.5px; font-weight:600; padding:6px 10px; border-radius:7px; white-space:nowrap; opacity:0; transform:translateY(3px); pointer-events:none; transition:opacity .15s ease, transform .15s ease; z-index:6; box-shadow:0 10px 24px -10px rgba(0,0,0,0.4); }
        .db-tip:hover::after{ opacity:1; transform:none; }

        /* Notificações: checkbox custom + troca ícone→checkbox no hover (estilo Gmail) */
        .db-chk{ position:relative; width:20px; height:20px; flex:none; cursor:pointer; display:inline-block; }
        .db-chk input{ position:absolute; inset:0; opacity:0; cursor:pointer; margin:0; z-index:1; }
        .db-chk .db-chk-box{ position:absolute; inset:0; border-radius:6px; border:1.5px solid ${color.gray300}; background:#fff; display:flex; align-items:center; justify-content:center; color:#fff; transition:background .15s ease, border-color .15s ease; }
        .db-chk .db-chk-box svg{ opacity:0; transform:scale(.5); transition:opacity .12s ease, transform .15s cubic-bezier(.2,.8,.2,1); }
        .db-chk:hover .db-chk-box{ border-color:${color.gray400}; }
        .db-chk input:checked + .db-chk-box{ background:${color.accent}; border-color:${color.accent}; }
        .db-chk input:checked + .db-chk-box svg{ opacity:1; transform:scale(1); }
        .db-chk input:focus-visible + .db-chk-box{ outline:2px solid ${color.accent}; outline-offset:2px; }
        .db-ntf-row{ display:flex; align-items:center; gap:12px; padding:13px 18px; background:#fff; transition:background .15s ease; }
        .db-ntf-row + .db-ntf-row{ border-top:1px solid #F3F3F3; }
        .db-ntf-row.un{ background:#FDF9F6; }
        .db-ntf-row:hover{ background:${color.surface3}; }
        .db-ntf-row.sel, .db-ntf-row.sel:hover{ background:${color.accentTint}; }
        .db-ntf-lead{ position:relative; width:34px; height:34px; flex:none; }
        .db-ntf-ico{ position:absolute; inset:0; border-radius:50%; display:flex; align-items:center; justify-content:center; transition:opacity .13s ease, transform .13s ease; }
        .db-ntf-lead .db-chk{ position:absolute; top:7px; left:7px; opacity:0; transform:scale(.75); transition:opacity .13s ease, transform .13s ease; }
        .db-ntf-row:hover .db-ntf-lead .db-chk, .db-ntf-row.sel .db-ntf-lead .db-chk{ opacity:1; transform:none; }
        .db-ntf-row:hover .db-ntf-ico, .db-ntf-row.sel .db-ntf-ico{ opacity:0; transform:scale(.8); }
        .db-ntf-dot{ flex:none; width:28px; height:28px; border-radius:50%; background:none; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background .13s ease; }
        .db-ntf-dot:hover{ background:rgba(20,20,30,0.06); }
        .db-ntf-dot:focus-visible{ outline:2px solid ${color.accent}; outline-offset:2px; }
        .db-ntf-dot i{ width:9px; height:9px; border-radius:50%; background:${color.accent}; transition:background .15s ease, box-shadow .15s ease; }
        .db-ntf-dot.read i{ background:transparent; box-shadow:inset 0 0 0 1.5px ${color.gray300}; }
        .db-ntf-dot.read:hover i{ box-shadow:inset 0 0 0 1.5px ${color.accent}; }
        @media (hover:none){
          .db-ntf-lead .db-chk{ opacity:1; transform:none; }
          .db-ntf-ico{ opacity:0; }
        }

        /* Interruptor (Configurações) */
        .db-sw{ position:relative; width:42px; height:24px; flex:none; display:inline-block; }
        .db-sw input{ position:absolute; inset:0; opacity:0; margin:0; cursor:pointer; z-index:1; }
        .db-sw i{ position:absolute; inset:0; border-radius:999px; background:${color.gray300}; transition:background .18s ease; }
        .db-sw i::after{ content:""; position:absolute; top:3px; left:3px; width:18px; height:18px; border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,0.25); transition:transform .18s cubic-bezier(.2,.8,.2,1); }
        .db-sw input:checked + i{ background:${color.accent}; }
        .db-sw input:checked + i::after{ transform:translateX(18px); }
        .db-sw input:focus-visible + i{ outline:2px solid ${color.accent}; outline-offset:2px; }
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
        .db-rot{ animation:dbSpin .6s linear infinite; }
        /* Campo clicável na prévia: leva o foco pro input no editor */
        .pd-edit{ cursor:pointer; border-radius:5px; box-decoration-break:clone; -webkit-box-decoration-break:clone; transition:background .12s ease, box-shadow .12s ease; }
        .pd-edit:hover{ background:rgba(217,119,87,0.14); box-shadow:0 0 0 3px rgba(217,119,87,0.14); }
        .pd-edit:focus-visible{ outline:2px solid ${color.accent}; outline-offset:2px; }
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
          .db-mark-only{ display:block !important; }
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
        <div style={{ padding: "18px 16px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 6px", marginBottom: 14, height: 28 }}>
            <img src="/logo-horizontal.svg" alt="Manda" className="db-collapsed" style={{ height: 24, width: "auto", display: "block" }} />
            <img src="/logo-mark.svg" alt="Manda" className="db-mark-only" style={{ width: 28, height: 28, flex: "none", display: "none" }} />
          </div>

          {/* Perfil no topo (com menu Sair), como na referência */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <button className="db-profile db-profbtn" title={profileName} aria-haspopup="menu" aria-expanded={profileMenu}
              onClick={() => setProfileMenu((v) => !v)}>
              <span style={{ width: 34, height: 34, flex: "none", borderRadius: "50%", background: color.accentTint, color: color.accentInk, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.heading, fontWeight: 700, fontSize: 14 }}>
                {user ? initials(user.name) : <User size={17} strokeWidth={2} />}
              </span>
              <div className="db-collapsed" style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <div style={{ fontSize: "13.5px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profileName}</div>
                <div style={{ fontSize: 12, color: quotaLow ? "#B4443C" : color.gray400, fontWeight: quotaLow ? 600 : 400 }}>{profileSub}</div>
              </div>
              <ChevronDown className="db-collapsed" size={16} strokeWidth={2} color={color.gray400} style={{ flex: "none", transition: "transform .15s", transform: profileMenu ? "rotate(180deg)" : "none" }} />
            </button>
            {profileMenu && (
              <>
                <div onClick={() => setProfileMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                <div role="menu" style={{ position: "absolute", top: "calc(100% + 4px)", left: 8, right: 8, zIndex: 41, background: color.white, border: `1px solid ${color.line2}`, borderRadius: 11, boxShadow: shadow.card, padding: 5 }}>
                  <button role="menuitem" onClick={() => { setProfileMenu(false); navTo("settings"); }} className="db-menuitem">
                    <Settings size={16} strokeWidth={1.9} />Configurações
                  </button>
                  <button role="menuitem" onClick={() => { setToken(null); go && go("landing"); }} className="db-menuitem">
                    <LogOut size={16} strokeWidth={1.9} />Sair
                  </button>
                </div>
              </>
            )}
          </div>

          <button onClick={newProposal} className="db-btn db-btn-accent db-new">
            <Plus size={17} strokeWidth={2.4} /><span className="db-collapsed">Nova proposta</span>
          </button>
        </div>

        <nav className="db-nav" style={{ flex: 1, padding: "6px 12px", display: "flex", flexDirection: "column", gap: 3 }}>
          {navMain.map(navItem)}
          <div className="db-collapsed db-navlabel">Preferências</div>
          {navPrefs.map(navItem)}
        </nav>

        {APP_VERSION && <div className="db-collapsed" style={{ borderTop: `1px solid ${color.line2}`, padding: "12px 22px", fontSize: 11, color: color.gray400, letterSpacing: "0.02em" }}>Manda v{APP_VERSION}</div>}
      </aside>

      {/* MAIN */}
      <main className="db-main">
        {serverDown && (
          <div style={{ background: "#FEF3E2", borderBottom: "1px solid #F5D9A8", color: "#8A5A1A", fontSize: "13.5px", fontWeight: 500, padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}><AlertTriangle size={15} strokeWidth={2} />Sem conexão com o servidor. Você ainda vê o que já carregou, mas concluir e sincronizar precisam de internet.</span>
            <button onClick={() => refreshRows()} className="db-btn" style={{ fontSize: 13, fontWeight: 600, color: "#8A5A1A", background: "#fff", border: "1px solid #F0C98A", borderRadius: 8, padding: "6px 12px", flex: "none" }}>Tentar de novo</button>
          </div>
        )}
        {view === "home" ? (
          <HomePage user={user} onNewProposal={newProposal} onNavigate={navTo} />
        ) : view === "list" ? (
          <div className="db-pad">
            <div className="db-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
              <div>
                <h1 style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 27, letterSpacing: "-0.02em", margin: "0 0 4px" }}>Suas propostas</h1>
                <p style={{ fontSize: "14.5px", color: color.gray500, margin: 0 }}>
                  Acompanhe o status de cada proposta num lugar só.
                  {booting && <span style={{ marginLeft: 8, color: color.gray400, fontSize: 13 }}><span className="db-spin" style={{ display: "inline-block", width: 11, height: 11, borderWidth: 1.5, borderColor: "rgba(0,0,0,0.12)", borderTopColor: color.gray400, verticalAlign: "-1px", marginRight: 5 }} />sincronizando…</span>}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <label className="db-search">
                  <Search size={16} strokeWidth={2} color={color.gray400} />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por cliente ou proposta" aria-label="Buscar propostas" />
                </label>
                <RefreshButton onRefresh={async () => { await refreshRows(); refreshUsage(); }} label="Atualizar propostas" />
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

            {onbLoaded && (!onb.hidden || onbCelebrate) && (
              <OnboardingCard steps={onbSteps} done={onbDone} onNew={newProposal} goSettings={() => navTo("settings")} onSkip={dismissOnb} onFinish={() => setOnbCelebrate(false)} />
            )}

            {followUps.length > 0 && (
              <div className="db-follow">
                <div className="db-follow-head">
                  <span className="db-follow-ic"><Clock size={16} strokeWidth={2.2} /></span>
                  <div style={{ minWidth: 0 }}>
                    <div className="db-follow-t">{followUps.length} proposta{followUps.length > 1 ? "s" : ""} parada{followUps.length > 1 ? "s" : ""}</div>
                    <div className="db-follow-s">Enviadas há alguns dias e ainda sem resposta. Um lembrete gentil costuma destravar.</div>
                  </div>
                </div>
                <div className="db-follow-list">
                  {followUps.slice(0, 4).map((f) => (
                    <div key={f.id} className="db-follow-item">
                      <div className="db-follow-info">
                        <span className="db-follow-name">{f.client || "Sem cliente"}</span>
                        <span className="db-follow-meta">{f.title || "Proposta"} · {f.viewed ? "viu, sem resposta" : "não abriu"} · há {f.daysSince} dias</span>
                      </div>
                      <button className="db-follow-btn" onClick={() => remind(f)} disabled={remindingId === f.id}>
                        {remindingId === f.id ? "Enviando…" : (<><Send size={14} strokeWidth={2.3} />Enviar lembrete</>)}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
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
                        {!isLocalId(r.id) && (
                          <button className="db-act db-act-un" onClick={duplicateRow(r)} aria-label={`Duplicar proposta de ${r.client || "cliente"}`} title="Duplicar"><Copy size={15} strokeWidth={2.2} /></button>
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
          <DesignGallery onUse={startWithDesign} plan={user?.role === "admin" ? "business" : user?.plan} onUpgrade={() => setShowPlans(true)} scope={user?.email} />
        ) : view === "calc" ? (
          <CalculatorPanel onNewProposal={(desc, value, list) => startProposalWithItem(desc, value, list)} scope={user?.email} />
        ) : view === "clients" ? (
          <ClientsPanel rows={rows} onRefresh={async () => { await refreshRows(); }} />
        ) : view === "notifications" ? (
          <NotificationsPanel notifs={notifs} readSet={notifRead} onRead={notifSetRead} onDelete={notifDelete} onRefresh={refreshNotifs} />
        ) : view === "support" ? (
          <SupportPage userEmail={user?.email} />
        ) : view === "settings" ? (
          <SettingsPanel user={user} setUser={setUser} go={go} pushToast={pushToast} usage={usage} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
            {/* action bar */}
            <div style={{ flex: "none", minHeight: 60, background: color.white, borderBottom: `1px solid ${color.line2}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 20px", flexWrap: "wrap" }}>
              <button onClick={exitEditor} className="db-btn" style={{ fontSize: 14, fontWeight: 500, color: color.gray600, background: "none", padding: "6px 8px" }}>
                <ArrowLeft size={17} strokeWidth={2.2} />{{ templates: "Templates", calc: "Calculadora" }[editorFrom] || "Propostas"}
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: locked ? "#8A5A1A" : color.gray400, marginRight: 6, display: "flex", alignItems: "center", gap: 6 }}>{locked ? <><Lock size={13} strokeWidth={2.2} />Enviada, somente leitura</> : <><span style={{ width: 7, height: 7, borderRadius: "50%", background: hasContent ? "#22C55E" : color.gray300 }} />{hasContent ? "Rascunho salvo ao sair" : "Rascunho"}</>}</span>
                <button onClick={() => setShowPreview((v) => !v)} className="db-btn db-btn-ghost" style={{ fontSize: 14, padding: "9px 15px" }} aria-pressed={showPreview}><Eye size={15} strokeWidth={2} />{showPreview ? "Ocultar prévia" : "Pré-visualizar"}</button>
              </div>
            </div>

            {/* split */}
            <div className="db-split" style={{ flex: 1, display: "grid", gridTemplateColumns: showPreview ? "1fr 1fr" : "1fr", minHeight: 0 }}>
              {/* editor side */}
              <div style={{ overflow: "auto", padding: "32px 36px", borderRight: showPreview ? `1px solid ${color.line2}` : "none" }}>
                {locked && (
                  <div style={{ maxWidth: 440, margin: "0 auto 20px", display: "flex", alignItems: "center", gap: 10, background: "#FEF3E2", border: "1px solid #F5D9A8", color: "#8A5A1A", borderRadius: 12, padding: "12px 14px", fontSize: "13.5px", fontWeight: 500 }}>
                    <Lock size={15} strokeWidth={2} style={{ flex: "none" }} />Esta proposta já foi enviada e não pode ser editada. Para outro cliente, crie uma nova.
                  </div>
                )}
                {isCopy && !locked && (
                  <div style={{ maxWidth: 440, margin: "0 auto 20px", display: "flex", alignItems: "flex-start", gap: 9, background: color.surface2, border: `1px solid ${color.line}`, color: color.gray600, borderRadius: 12, padding: "11px 13px", fontSize: "12.5px", lineHeight: 1.5 }}>
                    <Copy size={14} strokeWidth={2} style={{ flex: "none", marginTop: 1, color: color.gray400 }} />
                    <span>Esta é uma cópia. Ela fica salva só neste navegador até você clicar em <strong style={{ fontWeight: 600, color: color.gray700 }}>Concluir proposta</strong>.</span>
                  </div>
                )}
                <div style={{ maxWidth: 440, margin: "0 auto", display: "flex", flexDirection: "column", gap: 26, pointerEvents: locked ? "none" : "auto", opacity: locked ? 0.6 : 1 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 20, letterSpacing: "-0.01em", marginBottom: 4 }}>Monte sua proposta</div>
                      <div style={{ fontSize: "13.5px", color: color.gray500 }}>Preencha os campos e veja a proposta tomando forma à direita.</div>
                    </div>
                    {hasContent && (
                      <button onClick={clearFieldsClick} className="db-btn" style={{ flex: "none", fontSize: "12.5px", fontWeight: 600, gap: 5, color: clearArm ? "#B4443C" : color.gray500, background: "none", padding: "6px 9px", borderRadius: 8, border: `1px solid ${clearArm ? "#F5D2CD" : color.gray200}` }}>
                        <RotateCcw size={13} strokeWidth={2.2} />{clearArm ? "Confirmar?" : "Limpar campos"}
                      </button>
                    )}
                  </div>

                  <div>
                    <div style={sectionLabel}>Modelo da proposta</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {DESIGNS.map((d) => {
                        const on = (doc.template || "minimal") === d.id;
                        const locked = tplLocked(d.id);
                        return (
                          <button key={d.id} onClick={() => (locked ? setShowPlans(true) : setDoc((cur) => ({ ...cur, template: d.id })))} className="db-btn"
                            title={locked ? "Disponível no Pro. Clique para ver os planos." : undefined}
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "13px", fontWeight: 600, padding: "8px 13px", borderRadius: 9, border: `1px solid ${on ? color.ink : color.gray200}`, background: on ? color.ink : "#fff", color: on ? "#fff" : locked ? color.gray400 : color.ink900 }}>
                            {d.name}{locked && <Lock size={12} strokeWidth={2.2} />}
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
                      <div style={{ fontSize: "11.5px", color: color.gray400, marginTop: 6 }}>Quadrada (1:1), recomendado 400×400 px pra não cortar. PNG ou JPG, até 2 MB.</div>
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
                        <div style={{ fontSize: "11.5px", color: color.gray400, marginTop: 6 }}>Horizontal (paisagem), recomendado 1600×600 px pra não cortar. JPG ou PNG, até 2 MB.</div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={sectionLabel}>Cor de destaque</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <label className="db-colorpill">
                        <span className="db-colorchip" style={{ background: doc.accent }}>
                          <input type="color" value={doc.accent} onChange={(e) => setDoc((d) => ({ ...d, accent: e.target.value }))} aria-label="Escolher cor" />
                        </span>
                        <input value={doc.accent} onChange={(e) => setDoc((d) => ({ ...d, accent: e.target.value }))} maxLength={20} style={{ width: 74, border: "none", outline: "none", fontFamily: font.body, fontSize: 13, fontWeight: 600, textTransform: "uppercase", color: color.ink, background: "none" }} aria-label="Cor em hexadecimal" />
                      </label>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {PRESET_COLORS.map((c) => {
                          const on = (doc.accent || "").toLowerCase() === c.toLowerCase();
                          return (
                            <button key={c} className={on ? "db-swatch on" : "db-swatch"} onClick={() => setDoc((d) => ({ ...d, accent: c }))} aria-label={`Cor ${c}`} title={c}
                              style={{ background: c, boxShadow: on ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : "0 0 0 1px rgba(0,0,0,0.08)" }}>
                              {on && <Check size={13} strokeWidth={3} />}
                            </button>
                          );
                        })}
                      </div>
                      <span className="db-tip" data-tip="Surpreenda-me" style={{ display: "flex" }}>
                        <button className="db-dice" aria-label="Cor aleatória" onClick={() => setDoc((d) => ({ ...d, accent: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0").toUpperCase() }))}>
                          <Sparkles size={15} strokeWidth={2} />
                        </button>
                      </span>
                    </div>

                    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 16, maxWidth: 360, cursor: "pointer" }}>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: "13.5px", fontWeight: 600 }}>Usar gradiente</span>
                        <span style={{ display: "block", fontSize: 12, color: color.gray400, marginTop: 1 }}>Nos modelos Bold, Colorido e Aurora.</span>
                      </span>
                      <span className="db-sw"><input type="checkbox" checked={!!doc.gradient} onChange={(e) => setDoc((d) => ({ ...d, gradient: e.target.checked }))} aria-label="Usar gradiente" /><i /></span>
                    </label>
                    {doc.gradient && (
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap", animation: "dbUp .3s ease both" }}>
                        <label className="db-colorpill">
                          <span className="db-colorchip" style={{ background: doc.accent2 }}>
                            <input type="color" value={doc.accent2} onChange={(e) => setDoc((d) => ({ ...d, accent2: e.target.value }))} aria-label="Segunda cor" />
                          </span>
                          <input value={doc.accent2} onChange={(e) => setDoc((d) => ({ ...d, accent2: e.target.value }))} maxLength={20} style={{ width: 74, border: "none", outline: "none", fontFamily: font.body, fontSize: 13, fontWeight: 600, textTransform: "uppercase", color: color.ink, background: "none" }} aria-label="Segunda cor em hexadecimal" />
                        </label>
                        <span className="db-tip" data-tip="Trocar as cores" style={{ display: "flex" }}>
                          <button onClick={() => setDoc((d) => ({ ...d, accent: d.accent2, accent2: d.accent }))} className="db-btn" aria-label="Trocar as cores" style={{ width: 34, height: 34, border: `1px solid ${color.gray200}`, background: "#fff", borderRadius: 9, color: color.gray500 }}><RotateCcw size={15} strokeWidth={2} /></button>
                        </span>
                        <span style={{ flex: 1, minWidth: 90, height: 30, borderRadius: 9, background: `linear-gradient(135deg, ${doc.accent}, ${doc.accent2})`, border: `1px solid ${color.line}` }} />
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={sectionLabel}>Tema de fundo</div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {[["claro", "Claro", "#FFFFFF", "#3A3A3E"], ["creme", "Creme", "#FBF8F2", "#4E4433"], ["escuro", "Escuro", "#171719", "#C4C4CB"]].map(([id, label, bg, ink]) => {
                        const on = (doc.theme || "claro") === id;
                        return (
                          <button key={id} onClick={() => setDoc((d) => ({ ...d, theme: id }))} className={on ? "db-theme on" : "db-theme"} aria-pressed={on}>
                            <span className="db-theme-prev" style={{ background: bg }}>
                              <span style={{ height: 8, background: doc.accent }} />
                              <span style={{ padding: "9px 0 0", display: "flex", flexDirection: "column", gap: 5 }}>
                                <span className="db-theme-line" style={{ background: doc.accent, width: "44%" }} />
                                <span className="db-theme-line" style={{ background: ink, opacity: 0.55, width: "auto" }} />
                                <span className="db-theme-line" style={{ background: ink, opacity: 0.32, marginRight: 36 }} />
                              </span>
                            </span>
                            <span className="db-theme-name">{on && <Check size={13} strokeWidth={3} color={color.accent} />}{label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: "11.5px", color: color.gray400, marginTop: 10 }}>A prévia muda com a sua cor. O destaque continua no título e nos realces.</div>
                  </div>

                  {doc.template === "grande" && (
                    <div>
                      <div style={sectionLabel}>Marca d'água</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        {[["", "Automática"], ["custom", "Uma letra"], ["off", "Nenhuma"]].map(([mode, label]) => {
                          const cur = doc.watermark === "off" ? "off" : (doc.watermark ? "custom" : "");
                          const on = cur === mode;
                          return (
                            <button key={mode || "auto"} onClick={() => setDoc((d) => ({ ...d, watermark: mode === "custom" ? (d.watermark && d.watermark !== "off" ? d.watermark : (d.company || d.client || "M").trim().charAt(0).toUpperCase() || "M") : mode }))} className="db-btn"
                              style={{ fontSize: "13px", fontWeight: 600, padding: "8px 13px", borderRadius: 9, border: `1.5px solid ${on ? color.ink : color.gray200}`, background: "#fff", color: on ? color.ink : color.gray600 }}>
                              {label}
                            </button>
                          );
                        })}
                        {doc.watermark && doc.watermark !== "off" && (
                          <input value={doc.watermark} onChange={(e) => setDoc((d) => ({ ...d, watermark: (e.target.value.trim().charAt(0) || "").toUpperCase() }))} maxLength={1} aria-label="Letra da marca d'água"
                            style={{ width: 44, height: 40, textAlign: "center", fontFamily: font.heading, fontWeight: 900, fontSize: 18, border: `1px solid ${color.gray200}`, borderRadius: 9, outline: "none", color: color.ink, textTransform: "uppercase" }} />
                        )}
                      </div>
                      <div style={{ fontSize: "11.5px", color: color.gray400, marginTop: 8 }}>A letra gigante ao fundo da proposta. Automática usa a inicial do cliente ou da empresa.</div>
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <Field label="Cliente" required>
                      <input id="ed-client" className="db-input" list="db-known-clients" value={doc.client} onChange={pickClient} maxLength={LIMITS.client} placeholder="Nome do cliente" style={inp()} />
                      <datalist id="db-known-clients">
                        {knownClients.map((c, i) => <option key={i} value={c.name}>{c.company || c.email || ""}</option>)}
                      </datalist>
                    </Field>
                    <Field label="Empresa"><input className="db-input" value={doc.company} onChange={updDoc("company")} maxLength={LIMITS.company} placeholder="Empresa" style={inp()} /></Field>
                  </div>
                  <Field label="Título da proposta" required><input id="ed-title" className="db-input" value={doc.title} onChange={updDoc("title")} maxLength={LIMITS.title} placeholder="Ex: Produção de vídeo institucional" style={inp()} /></Field>

                  <div>
                    <div style={sectionLabel}>Escopo</div>
                    <textarea id="ed-scope" className="db-input" value={doc.scope} onChange={updDoc("scope")} maxLength={LIMITS.scope} rows={4} placeholder="Descreva o que está incluído no serviço." style={{ ...inp(), resize: "vertical", lineHeight: 1.5 }} />
                    <div style={{ fontSize: "12px", color: color.gray400, marginTop: 5, textAlign: "right" }}>{doc.scope.length}/{LIMITS.scope}</div>
                  </div>

                  <div>
                    <div style={sectionLabel}>Investimento</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {doc.items.map((it, i) => {
                        const isDragging = dragItem === i;
                        const isOver = overItem === i && dragItem !== null && dragItem !== i;
                        return (
                        <div
                          key={i}
                          onDragOver={(e) => { if (dragItem === null || locked) return; e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (overItem !== i) setOverItem(i); }}
                          onDrop={(e) => { e.preventDefault(); if (dragItem !== null) moveItem(dragItem, i); setDragItem(null); setOverItem(null); }}
                          style={{ display: "flex", gap: 8, alignItems: "center", opacity: isDragging ? 0.4 : (it.hidden ? 0.55 : 1), borderRadius: 10, boxShadow: isOver ? `0 -2px 0 ${color.accent}` : "none", transition: "opacity .12s ease" }}
                        >
                          {doc.items.length > 1 && !locked && (
                            <button
                              draggable
                              onDragStart={(e) => { setDragItem(i); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", String(i)); } catch { /* ignore */ } }}
                              onDragEnd={() => { setDragItem(null); setOverItem(null); }}
                              onKeyDown={(e) => { if (e.key === "ArrowUp") { e.preventDefault(); moveItem(i, i - 1); } else if (e.key === "ArrowDown") { e.preventDefault(); moveItem(i, i + 1); } }}
                              className="db-grip"
                              aria-label={`Reordenar item ${i + 1}. Arraste, ou use as setas para cima e para baixo`}
                              title="Arraste para reordenar (ou use as setas ↑ ↓)"
                              style={{ flex: "none", width: 20, height: 38, border: "none", background: "none", padding: 0, touchAction: "none" }}
                            ><GripVertical size={16} strokeWidth={2} /></button>
                          )}
                          <input id={i === 0 ? "ed-item0" : undefined} className="db-input" value={it.desc} onChange={updItem(i, "desc")} maxLength={LIMITS.itemDesc} placeholder="Item" style={{ ...inp(), flex: 1, textDecoration: it.hidden ? "line-through" : "none", color: it.hidden ? color.gray400 : color.ink }} />
                          <div className="db-input" style={{ display: "flex", alignItems: "center", gap: 4, flex: "none", width: 118, border: `1px solid ${color.gray200}`, borderRadius: 9, padding: "0 10px", background: it.hidden ? color.surface : color.white }}>
                            <span style={{ fontSize: 13, color: color.gray400 }}>R$</span>
                            <input value={it.value} onChange={updItem(i, "value")} maxLength={LIMITS.itemValue} inputMode="numeric" placeholder="0" style={{ width: "100%", border: "none", outline: "none", fontFamily: font.body, fontSize: 14, padding: "10px 0", background: "transparent", textDecoration: it.hidden ? "line-through" : "none", color: it.hidden ? color.gray400 : color.ink }} />
                          </div>
                          <span className="db-tip" data-tip={it.hidden ? "Cliente não vê nem paga. Clique para mostrar" : "Ocultar do cliente (não cobra)"} style={{ flex: "none", display: "flex" }}>
                            <button onClick={() => toggleItemHidden(i)} className="db-btn" aria-label={it.hidden ? "Mostrar item ao cliente" : "Ocultar item do cliente"} aria-pressed={it.hidden} style={{ flex: "none", width: 34, height: 38, border: "1px solid #EEE", background: color.white, borderRadius: 9, color: it.hidden ? color.gray300 : color.gray500 }}>{it.hidden ? <EyeOff size={15} strokeWidth={2} /> : <Eye size={15} strokeWidth={2} />}</button>
                          </span>
                          <button onClick={removeItem(i)} className="db-btn" aria-label="Remover item" style={{ flex: "none", width: 34, height: 38, border: "1px solid #EEE", background: color.white, borderRadius: 9, color: color.gray400 }}><Trash2 size={15} strokeWidth={2} /></button>
                        </div>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
                      <button onClick={addItem} disabled={doc.items.length >= MAX_ITEMS} className="db-btn" style={{ fontSize: "13.5px", color: color.accent, background: "none", padding: "4px 2px" }}>
                        <Plus size={15} strokeWidth={2.4} />Adicionar item
                      </button>
                      <button onClick={() => setShowCalc(true)} disabled={doc.items.length >= MAX_ITEMS} className="db-btn" style={{ fontSize: "13.5px", color: color.gray600, background: "none", padding: "4px 2px", gap: 6 }}>
                        <Calculator size={15} strokeWidth={2} />Calcular preço
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
                    <textarea id="ed-bio" className="db-input" value={doc.bio} onChange={updDoc("bio")} maxLength={LIMITS.bio} rows={3} placeholder="Uma breve apresentação sua." style={{ ...inp(), resize: "vertical", lineHeight: 1.5 }} />
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
                  <ProposalDesign id={doc.template} doc={doc} accent={doc.accent} onEdit={locked ? undefined : focusField} />
                </div>
              )}
            </div>

            {showCalc && <PriceCalculator onClose={() => setShowCalc(false)} onApply={applyPrice} scope={user?.email} />}

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
                {locked ? (
                  <>
                    <button onClick={copyLink} className="db-btn db-btn-ghost" style={{ fontSize: 14, padding: "11px 18px" }}><Link2 size={15} strokeWidth={2.2} />{copied ? "Copiado!" : "Copiar link"}</button>
                    <button onClick={downloadPdf} disabled={pdfBusy} className="db-btn db-btn-dark db-finish" style={{ fontSize: 14, padding: "11px 18px" }}><Download size={15} strokeWidth={2.2} />{pdfBusy ? "Gerando…" : "Baixar PDF"}</button>
                  </>
                ) : (
                  <button onClick={finish} disabled={!canFinish || sending} className="db-btn db-btn-accent db-finish">
                    <Check size={17} strokeWidth={2.6} />{sending ? "Concluindo…" : "Concluir proposta"}
                  </button>
                )}
              </div>

              {flowError && <div className="db-foot-err">{flowError}</div>}
            </div>
          </div>
        )}
      </main>

      {/* Cópia oculta da proposta, só para gerar o PDF (mesmo design do cliente) */}
      {view === "editor" && (
        <div ref={pdfRef} aria-hidden="true" style={{ position: "fixed", left: -99999, top: 0, width: 720, background: "#fff", padding: 24, pointerEvents: "none", zIndex: -1 }}>
          <ProposalDesign id={doc.template} doc={doc} accent={doc.accent} />
        </div>
      )}

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
                    <input className="db-input" type="email" value={doc.clientEmail} onChange={(e) => { updDoc("clientEmail")(e); if (emailState !== "idle") { setEmailState("idle"); setEmailNote(""); } }} placeholder="cliente@email.com" autoComplete="email" disabled={emailState === "sending" || emailState === "sent"} style={{ ...inp(), flex: 1, height: 42 }} />
                    <button onClick={sendByEmail} disabled={emailState === "sending" || emailState === "sent"} className="db-btn db-btn-dark" style={{ flex: "none", fontSize: 14, padding: "0 16px", height: 42, borderRadius: 10, background: emailState === "sent" ? "#22C55E" : undefined, borderColor: emailState === "sent" ? "#22C55E" : undefined }}>
                      {emailState === "sent" ? <><Check size={16} strokeWidth={2.6} />Enviado</> : <><Mail size={16} strokeWidth={2.2} />{emailState === "sending" ? "Enviando…" : "Enviar"}</>}
                    </button>
                  </div>
                  {emailNote && (
                    <div style={{ fontSize: "12.5px", marginTop: -2, color: emailState === "sent" ? "#2E7D51" : emailState === "connect" ? color.gray600 : "#B4443C", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span>{emailNote}</span>
                      {emailState === "connect" && (
                        <button onClick={() => { setView("settings"); setFlow("editing"); }} className="db-btn" style={{ background: "none", color: color.accentInk, fontWeight: 600, fontSize: "12.5px", padding: "2px 4px", textDecoration: "underline" }}>Conectar agora</button>
                      )}
                    </div>
                  )}
                </div>

                <button onClick={downloadPdf} disabled={pdfBusy} className="db-in-3 db-btn db-btn-ghost" style={{ width: "100%", marginTop: 14, fontSize: 14, padding: "11px 0" }}>
                  <Download size={15} strokeWidth={2.2} />{pdfBusy ? "Gerando PDF…" : "Baixar em PDF"}
                </button>

                <div className="db-in-3" style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  {!locked && (
                    <button onClick={() => setFlow("editing")} className="db-btn db-btn-ghost" style={{ flex: 1, fontSize: 14, padding: "11px 0" }}><Pencil size={15} strokeWidth={2.2} />Editar</button>
                  )}
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
          <div className="db-intro-mark"><img src="/logo-mark.svg" alt="Manda" style={{ width: "58%", height: "58%", display: "block" }} /></div>
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

      {view !== "support" && <SupportChat raised={view === "editor"} onOpenPage={() => setView("support")} />}
    </div>
  );
}

function NotificationsPanel({ notifs, readSet, onRead, onDelete, onRefresh }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(new Set());
  const [confirmAll, setConfirmAll] = useState(false); // "Excluir todas" em 2 passos

  const style = (type) => type === "accepted" ? { I: Check, c: "#2E7D51", bg: "#EAF5EE" }
    : type === "declined" ? { I: X, c: "#B4443C", bg: "#FDECEA" }
    : { I: Eye, c: color.accentInk, bg: color.accentTint };

  const norm = (s) => String(s || "").toLowerCase();
  const list = q.trim()
    ? notifs.filter((n) => norm(n.client).includes(norm(q)) || norm(n.title).includes(norm(q)) || norm(NOTIF_VERB[n.type]).includes(norm(q)))
    : notifs;
  const unreadCount = notifs.filter((n) => !readSet.has(n.id)).length;

  const toggleSel = (id) => setSel((s) => { const x = new Set(s); x.has(id) ? x.delete(id) : x.add(id); return x; });
  const allVisibleSel = list.length > 0 && list.every((n) => sel.has(n.id));
  const toggleAllVisible = () => setSel(allVisibleSel ? new Set() : new Set(list.map((n) => n.id)));
  const selIds = [...sel];
  const clearSel = () => setSel(new Set());

  const actBtn = { fontSize: "12.5px", fontWeight: 600, padding: "7px 11px", borderRadius: 8, background: "#fff", border: `1px solid ${color.gray200}`, color: color.gray700 };

  useEffect(() => { if (!confirmAll) return; const t = setTimeout(() => setConfirmAll(false), 3500); return () => clearTimeout(t); }, [confirmAll]);

  const Chk = ({ checked, onChange, label }) => (
    <span className="db-chk">
      <input type="checkbox" checked={checked} onChange={onChange} aria-label={label} />
      <span className="db-chk-box"><Check size={13} strokeWidth={3.2} /></span>
    </span>
  );

  return (
    <div className="db-pad" style={{ maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 27, letterSpacing: "-0.02em", margin: "0 0 4px" }}>Notificações</h1>
          <p style={{ fontSize: "14.5px", color: color.gray500, margin: 0 }}>Cada vez que um cliente interage com suas propostas, aparece aqui.</p>
        </div>
        {onRefresh && <RefreshButton onRefresh={onRefresh} label="Buscar novas notificações" />}
      </div>

      {notifs.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <label className="db-search" style={{ flex: "1 1 200px", maxWidth: 300 }}>
            <Search size={15} strokeWidth={2} color={color.gray400} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por cliente ou proposta" aria-label="Buscar notificações" />
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginLeft: "auto" }}>
            {sel.size > 0 ? (
              <>
                <button onClick={() => { onRead(selIds, true); clearSel(); }} className="db-btn" style={actBtn}><Check size={13} strokeWidth={2.4} />Marcar lidas</button>
                <button onClick={() => { onRead(selIds, false); clearSel(); }} className="db-btn" style={actBtn}><Bell size={13} strokeWidth={2.2} />Não lidas</button>
                <button onClick={() => { onDelete(selIds); clearSel(); }} className="db-btn" style={{ ...actBtn, color: "#B4443C", borderColor: "#F5D2CD" }}><Trash2 size={13} strokeWidth={2.2} />Excluir ({sel.size})</button>
              </>
            ) : (
              <>
                <button onClick={() => onRead(notifs.map((n) => n.id), true)} disabled={!unreadCount} className="db-btn" style={{ ...actBtn, opacity: unreadCount ? 1 : 0.5 }}><Check size={13} strokeWidth={2.4} />Marcar todas como lidas</button>
                <button onClick={() => { confirmAll ? (onDelete(notifs.map((n) => n.id)), setConfirmAll(false)) : setConfirmAll(true); }} className="db-btn"
                  style={{ ...actBtn, color: "#fff", background: confirmAll ? "#B4443C" : "#fff", borderColor: confirmAll ? "#B4443C" : "#F5D2CD", ...(confirmAll ? {} : { color: "#B4443C" }) }}>
                  <Trash2 size={13} strokeWidth={2.2} />{confirmAll ? "Confirmar exclusão?" : "Excluir todas"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {list.length ? (
        <div style={{ background: "#fff", border: `1px solid ${color.line2}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "10px 18px 10px 25px", background: color.surface3, borderBottom: "1px solid #EEE" }}>
            <Chk checked={allVisibleSel} onChange={toggleAllVisible} label="Selecionar todas as visíveis" />
            <span style={{ fontSize: "11.5px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: color.gray400 }}>
              {sel.size ? `${sel.size} selecionada${sel.size > 1 ? "s" : ""}` : unreadCount ? `${unreadCount} não lida${unreadCount > 1 ? "s" : ""}` : "Tudo lido"}
            </span>
          </div>
          {list.map((n) => {
            const s = style(n.type);
            const isUnread = !readSet.has(n.id);
            const isSel = sel.has(n.id);
            return (
              <div key={n.id} className={`db-ntf-row${isUnread ? " un" : ""}${isSel ? " sel" : ""}`}>
                <span className="db-ntf-lead">
                  <span className="db-ntf-ico" style={{ background: s.bg, color: s.c }}><s.I size={16} strokeWidth={2.4} /></span>
                  <Chk checked={isSel} onChange={() => toggleSel(n.id)} label={`Selecionar notificação de ${n.client || "cliente"}`} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: color.ink }}>
                    <strong style={{ fontWeight: isUnread ? 700 : 600 }}>{(n.client || "Alguém").trim() || "Alguém"}</strong> {NOTIF_VERB[n.type] || "interagiu com"} <span style={{ color: color.gray600 }}>“{n.title || "sua proposta"}”</span>
                  </div>
                  <div style={{ fontSize: 12, color: color.gray400, display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}><Clock size={12} strokeWidth={2} />{timeAgo(n.createdAt)}</div>
                </div>
                <span className="db-tip" data-tip={isUnread ? "Marcar como lida" : "Marcar como não lida"} style={{ flex: "none", display: "flex" }}>
                  <button onClick={() => onRead([n.id], isUnread)} className={`db-ntf-dot${isUnread ? "" : " read"}`} aria-label={isUnread ? "Marcar como lida" : "Marcar como não lida"}>
                    <i />
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      ) : notifs.length ? (
        <div style={{ background: "#fff", border: "1px dashed #DDD", borderRadius: 16, padding: "44px 24px", textAlign: "center" }}>
          <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 17, marginBottom: 6 }}>Nada encontrado</div>
          <p style={{ fontSize: 14, color: color.gray500, margin: "0 0 16px" }}>Nenhuma notificação corresponde à sua busca.</p>
          <button onClick={() => setQ("")} className="db-btn db-btn-ghost" style={{ fontSize: 13.5, padding: "9px 16px" }}>Limpar busca</button>
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

const calcChip = (on) => ({
  fontSize: "12.5px", fontWeight: 600, padding: "7px 12px", borderRadius: 999, cursor: "pointer",
  border: `1px solid ${on ? color.ink : color.gray200}`, background: on ? color.ink : "#fff", color: on ? "#fff" : color.gray600,
});
const calcLabel = { fontSize: 12, fontWeight: 600, color: color.gray500, display: "block", marginBottom: 6 };

// Sanitiza entrada numérica: só dígitos e UM separador decimal, limita o
// comprimento e o valor máximo. Impede números absurdos que quebram o layout
// e o cálculo (ex.: margem de 10^30%).
function clampNum(s, { max, maxLen = 10, integer = false } = {}) {
  let v = String(s).replace(integer ? /[^0-9]/g : /[^0-9.,]/g, "");
  if (!integer) {
    const idx = v.search(/[.,]/);
    if (idx >= 0) v = v.slice(0, idx + 1) + v.slice(idx + 1).replace(/[.,]/g, ""); // um separador só
  }
  if (v.length > maxLen) v = v.slice(0, maxLen);
  if (max != null && v !== "" && v !== "." && v !== ",") {
    const num = parseFloat(v.replace(",", "."));
    if (!isNaN(num) && num > max) v = String(max);
  }
  return v;
}

// Campo numérico com prefixo/sufixo (R$, km, %...) e limites de segurança.
function NumField({ label, value, onChange, prefix, suffix, placeholder, width, max, maxLen, integer }) {
  return (
    <label style={{ display: "block", width: width || "auto" }}>
      <span style={calcLabel}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 5, border: `1px solid ${color.gray200}`, borderRadius: 9, padding: "0 11px", background: "#fff" }}>
        {prefix && <span style={{ fontSize: 13, color: color.gray400, flex: "none" }}>{prefix}</span>}
        <input value={value} onChange={(e) => onChange(clampNum(e.target.value, { max, maxLen, integer }))} inputMode="decimal" placeholder={placeholder || "0"}
          style={{ width: "100%", minWidth: 0, border: "none", outline: "none", fontFamily: font.body, fontSize: 14, padding: "10px 0", background: "transparent", fontVariantNumeric: "tabular-nums" }} />
        {suffix && <span style={{ fontSize: 12.5, color: color.gray400, flex: "none" }}>{suffix}</span>}
      </span>
    </label>
  );
}

function CostBuilder({ onApply, applyLabel, scope }) {
  const saved = useMemo(() => { try { return JSON.parse(localStorage.getItem(calcProfileKey(scope)) || "{}"); } catch { return {}; } }, [scope]);
  const [nome, setNome] = useState(saved.nome || "");
  const [travelOn, setTravelOn] = useState(!!saved.travelOn);
  const [litro, setLitro] = useState(saved.litro || "");
  const [consumo, setConsumo] = useState(saved.consumo || String(DEFAULT_CONSUMO));
  const [distancia, setDistancia] = useState(saved.distancia || "");
  const [idaVolta, setIdaVolta] = useState(saved.idaVolta != null ? saved.idaVolta : true);
  const [tools, setTools] = useState(saved.tools || []);
  const [projetosMes, setProjetosMes] = useState(saved.projetosMes || "4");
  const [materials, setMaterials] = useState(saved.materials || []);
  const [horas, setHoras] = useState(saved.horas || "");
  const [valorHora, setValorHora] = useState(saved.valorHora || "");
  const [diff, setDiff] = useState(saved.diff || "media");
  const [margem, setMargem] = useState(saved.margem != null ? saved.margem : "30");
  const [imposto, setImposto] = useState(saved.imposto != null ? saved.imposto : "0");

  // Salva TUDO no localStorage (não no banco, pra não gastar memória lá).
  // Recarregar restaura o estado inteiro: campos fixos e os do trabalho atual.
  // A trava `mounted` impede gravar ANTES de o estado inicial carregar (senão,
  // enquanto o email do usuário ainda não chegou, gravaria vazio por cima).
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    const p = { nome, travelOn, litro, consumo, distancia, idaVolta, tools, projetosMes, materials, horas, valorHora, diff, margem, imposto };
    try { localStorage.setItem(calcProfileKey(scope), JSON.stringify(p)); } catch { /* ignore */ }
  }, [nome, travelOn, litro, consumo, distancia, idaVolta, tools, projetosMes, materials, horas, valorHora, diff, margem, imposto, scope]);

  const clearAll = () => {
    setNome(""); setTravelOn(false); setLitro(""); setConsumo(String(DEFAULT_CONSUMO));
    setDistancia(""); setIdaVolta(true); setTools([]); setProjetosMes("4");
    setMaterials([]); setHoras(""); setValorHora(""); setDiff("media"); setMargem("30"); setImposto("0");
    try { localStorage.removeItem(calcProfileKey(scope)); } catch { /* ignore */ }
  };
  const hasAny = nome || travelOn || litro || distancia || tools.length || materials.length || horas || valorHora || (margem && margem !== "30") || (imposto && imposto !== "0");

  const n = (v) => { const x = parseFloat(String(v).replace(",", ".")); return isNaN(x) ? 0 : x; };
  const fuel = travelOn ? (n(distancia) * (idaVolta ? 2 : 1) / Math.max(1, n(consumo))) * n(litro) : 0;
  const toolsMonthly = tools.reduce((a, t) => a + n(t.monthly), 0);
  const toolsCost = toolsMonthly / Math.max(1, n(projetosMes) || 1);
  const materialsCost = materials.reduce((a, m) => a + n(m.value), 0);
  const custos = fuel + toolsCost + materialsCost;
  const diffMult = (PROJECT_DIFFICULTY.find((d) => d.key === diff) || PROJECT_DIFFICULTY[1]).mult;
  const mao = n(horas) * n(valorHora) * diffMult;
  const subtotal = custos + mao;
  const comMargem = subtotal * (1 + n(margem) / 100);
  const imp = n(imposto);
  const final = imp > 0 && imp < 100 ? comMargem / (1 - imp / 100) : comMargem;

  // Monta as linhas da proposta a partir dos componentes somados. A margem e o
  // imposto (o "markup" = preço final / subtotal) são distribuídos em cada linha,
  // então o total das linhas bate com o preço sugerido.
  const buildItems = () => {
    const parts = [];
    if (mao > 0) parts.push({ desc: nome.trim() || "Serviço", base: mao });
    if (fuel > 0) parts.push({ desc: idaVolta ? "Deslocamento (ida e volta)" : "Deslocamento", base: fuel });
    tools.forEach((t) => { const m = n(t.monthly) / Math.max(1, n(projetosMes) || 1); if (t.name.trim() && m > 0) parts.push({ desc: t.name.trim(), base: m }); });
    materials.forEach((m2) => { if (m2.name.trim() && n(m2.value) > 0) parts.push({ desc: m2.name.trim(), base: n(m2.value) }); });
    const target = Math.round(final);
    const baseSum = parts.reduce((a, p) => a + p.base, 0);
    if (parts.length === 0 || baseSum <= 0) return [{ desc: nome.trim() || "Serviço", value: String(target) }];
    const k = target / baseSum;
    const items = parts.map((p) => ({ desc: p.desc, value: Math.round(p.base * k) }));
    const diffFix = target - items.reduce((a, x) => a + x.value, 0);
    items[items.length - 1].value = Math.max(0, items[items.length - 1].value + diffFix); // ajuste de arredondamento
    return items.slice(0, MAX_ITEMS).map((x) => ({ desc: x.desc, value: String(x.value) }));
  };

  const addTool = () => setTools((t) => [...t, { name: "", monthly: "" }]);
  const setTool = (i, k, v) => setTools((t) => t.map((x, j) => (j === i ? { ...x, [k]: k === "monthly" ? clampNum(v, { max: 999999, maxLen: 7 }) : v } : x)));
  const rmTool = (i) => setTools((t) => t.filter((_, j) => j !== i));
  const addMat = () => setMaterials((m) => [...m, { name: "", value: "" }]);
  const setMat = (i, k, v) => setMaterials((m) => m.map((x, j) => (j === i ? { ...x, [k]: k === "value" ? clampNum(v, { max: 999999, maxLen: 7 }) : v } : x)));
  const rmMat = (i) => setMaterials((m) => m.filter((_, j) => j !== i));

  const card = { border: `1px solid ${color.line2}`, borderRadius: 13, padding: "16px 16px" };
  const cardHead = { fontSize: 14, fontWeight: 700, marginBottom: 3 };
  const cardSub = { fontSize: "12.5px", color: color.gray500, margin: "0 0 14px" };
  const line = (label, value, faded) => (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: faded ? color.gray400 : color.gray600, padding: "3px 0" }}>
      <span>{label}</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtBRL(value)}</span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontSize: 12, color: color.gray400 }}>Preenchido salva sozinho neste navegador.</span>
        <button onClick={clearAll} disabled={!hasAny} className="db-btn" style={{ fontSize: "12.5px", fontWeight: 600, color: hasAny ? color.gray600 : color.gray300, background: "none", padding: "5px 8px", gap: 5 }}>
          <RotateCcw size={13} strokeWidth={2.2} />Limpar tudo
        </button>
      </div>
      <label style={{ display: "block" }}>
        <span style={calcLabel}>O que você vai cobrar?</span>
        <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} placeholder="ex: Ensaio fotográfico, Landing page…" style={inp()} />
      </label>

      {/* Deslocamento */}
      <div style={card}>
        <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, cursor: "pointer" }}>
          <span>
            <span style={cardHead}>Deslocamento</span>
            <span style={{ ...cardSub, margin: 0, display: "block" }}>Gasolina pra ir até o cliente.</span>
          </span>
          <span className="db-sw"><input type="checkbox" checked={travelOn} onChange={() => setTravelOn((v) => !v)} aria-label="Incluir deslocamento" /><i /></span>
        </label>
        {travelOn && (
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
            <NumField label="Preço do litro" prefix="R$" value={litro} onChange={setLitro} placeholder="ex: 6,00" max={99} maxLen={5} />
            <NumField label="Distância" suffix="km" value={distancia} onChange={setDistancia} placeholder="ex: 12" max={9999} maxLen={5} />
            <NumField label="Consumo" suffix="km/L" value={consumo} onChange={setConsumo} placeholder="ex: 11" max={99} maxLen={4} />
            <label style={{ display: "block" }}>
              <span style={calcLabel}>Trajeto</span>
              <button onClick={() => setIdaVolta((v) => !v)} className="db-btn" style={{ width: "100%", justifyContent: "center", fontSize: 13, fontWeight: 600, padding: "10px 0", borderRadius: 9, border: `1px solid ${color.gray200}`, background: "#fff", color: color.gray700 }}>{idaVolta ? "Ida e volta" : "Só ida"}</button>
            </label>
          </div>
        )}
      </div>

      {/* Ferramentas e assinaturas */}
      <div style={card}>
        <div style={cardHead}>Ferramentas e assinaturas</div>
        <p style={cardSub}>O que você paga por mês pra trabalhar (Adobe, IA, plugins). É rateado pelos projetos do mês.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tools.map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input value={t.name} onChange={(e) => setTool(i, "name", e.target.value)} maxLength={40} placeholder="Ex: Pacote Adobe" style={{ ...inp(), flex: 1 }} />
              <span style={{ display: "flex", alignItems: "center", gap: 4, border: `1px solid ${color.gray200}`, borderRadius: 9, padding: "0 10px", background: "#fff", flex: "none", width: 110 }}>
                <span style={{ fontSize: 13, color: color.gray400 }}>R$</span>
                <input value={t.monthly} onChange={(e) => setTool(i, "monthly", e.target.value)} inputMode="decimal" placeholder="ex: 120" style={{ width: "100%", minWidth: 0, border: "none", outline: "none", fontFamily: font.body, fontSize: 14, padding: "10px 0", background: "transparent" }} />
              </span>
              <button onClick={() => rmTool(i)} className="db-btn" aria-label="Remover" style={{ flex: "none", width: 34, height: 38, border: "1px solid #EEE", background: "#fff", borderRadius: 9, color: color.gray400 }}><Trash2 size={15} strokeWidth={2} /></button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
          <button onClick={addTool} className="db-btn" style={{ fontSize: "13.5px", color: color.accent, background: "none", padding: "4px 2px" }}><Plus size={15} strokeWidth={2.4} />Adicionar ferramenta</button>
          {tools.length > 0 && (
            <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "12.5px", color: color.gray500 }}>
              Projetos por mês
              <input value={projetosMes} onChange={(e) => setProjetosMes(clampNum(e.target.value, { max: 999, maxLen: 3, integer: true }))} inputMode="numeric" style={{ width: 48, textAlign: "center", border: `1px solid ${color.gray200}`, borderRadius: 8, padding: "6px 4px", fontFamily: font.body, fontSize: 13 }} />
            </label>
          )}
        </div>
      </div>

      {/* Custos do projeto */}
      <div style={card}>
        <div style={cardHead}>Custos do projeto</div>
        <p style={cardSub}>Gastos só deste trabalho: impressão, banco de imagens, insumos, terceiros.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {materials.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input value={m.name} onChange={(e) => setMat(i, "name", e.target.value)} maxLength={40} placeholder="Ex: Banco de imagens" style={{ ...inp(), flex: 1 }} />
              <span style={{ display: "flex", alignItems: "center", gap: 4, border: `1px solid ${color.gray200}`, borderRadius: 9, padding: "0 10px", background: "#fff", flex: "none", width: 110 }}>
                <span style={{ fontSize: 13, color: color.gray400 }}>R$</span>
                <input value={m.value} onChange={(e) => setMat(i, "value", e.target.value)} inputMode="decimal" placeholder="ex: 90" style={{ width: "100%", minWidth: 0, border: "none", outline: "none", fontFamily: font.body, fontSize: 14, padding: "10px 0", background: "transparent" }} />
              </span>
              <button onClick={() => rmMat(i)} className="db-btn" aria-label="Remover" style={{ flex: "none", width: 34, height: 38, border: "1px solid #EEE", background: "#fff", borderRadius: 9, color: color.gray400 }}><Trash2 size={15} strokeWidth={2} /></button>
            </div>
          ))}
        </div>
        <button onClick={addMat} className="db-btn" style={{ fontSize: "13.5px", color: color.accent, background: "none", padding: "8px 2px 0" }}><Plus size={15} strokeWidth={2.4} />Adicionar custo</button>
      </div>

      {/* Seu trabalho */}
      <div style={card}>
        <div style={cardHead}>Seu trabalho</div>
        <p style={cardSub}>O tempo que você vai investir e quanto vale a sua hora.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <NumField label="Horas estimadas" suffix="h" value={horas} onChange={setHoras} placeholder="ex: 8" max={999} maxLen={5} />
          <NumField label="Valor da sua hora" prefix="R$" value={valorHora} onChange={setValorHora} placeholder="ex: 60" max={99999} maxLen={6} />
        </div>
        <span style={calcLabel}>Dificuldade do projeto</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {PROJECT_DIFFICULTY.map((d) => <button key={d.key} onClick={() => setDiff(d.key)} title={d.hint} style={calcChip(diff === d.key)}>{d.label}</button>)}
        </div>
      </div>

      {/* Margem e impostos */}
      <div style={{ ...card, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <NumField label="Margem de lucro" suffix="%" value={margem} onChange={setMargem} placeholder="ex: 30" max={300} maxLen={4} />
        <NumField label="Impostos e taxas" suffix="%" value={imposto} onChange={setImposto} placeholder="ex: 6" max={90} maxLen={4} />
      </div>

      {/* Resultado */}
      <div style={{ background: "linear-gradient(180deg, " + color.accentTint + " 0%, #fff 92%)", border: `1px solid ${color.accentLine}`, borderRadius: 14, padding: "18px 20px" }}>
        <div style={{ marginBottom: 12 }}>
          {custos > 0 && line("Custos (deslocamento, ferramentas, projeto)", custos)}
          {mao > 0 && line(`Seu trabalho (${n(horas) || 0}h × ${diffMult}×)`, mao)}
          {n(margem) > 0 && line(`Margem de lucro (${n(margem)}%)`, comMargem - subtotal, true)}
          {imp > 0 && line(`Impostos e taxas (${imp}%)`, final - comMargem, true)}
        </div>
        <div style={{ borderTop: `1px solid ${color.accentLine}`, paddingTop: 14, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: color.accentInk, display: "flex", alignItems: "center", gap: 6, flex: "none" }}><Sparkles size={13} strokeWidth={2.2} />Preço sugerido</span>
          <span style={{ fontFamily: font.body, fontWeight: 700, fontSize: 28, letterSpacing: "-0.02em", color: color.ink, fontVariantNumeric: "tabular-nums", minWidth: 0, overflowWrap: "anywhere", textAlign: "right" }}>{fmtBRL(final)}</span>
        </div>
      </div>

      <button onClick={() => onApply(nome.trim() || "Serviço", Math.round(final), buildItems())} disabled={final <= 0} className="db-btn db-btn-dark" style={{ fontSize: 14, padding: "12px 18px", alignSelf: "flex-start", maxWidth: "100%", opacity: final > 0 ? 1 : 0.5 }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{applyLabel} {fmtBRL(final)}</span>
      </button>
    </div>
  );
}

function MarketTable({ onApply, applyLabel }) {
  const [catIdx, setCatIdx] = useState(0);
  const [svc, setSvc] = useState(null);
  const [cx, setCx] = useState("media");
  const [urg, setUrg] = useState("normal");
  const cat = PRICE_TABLE[catIdx];
  const cxMult = (COMPLEXITY.find((c) => c.key === cx) || COMPLEXITY[1]).mult;
  const urgMult = (URGENCY.find((u) => u.key === urg) || URGENCY[0]).mult;
  const r = svc ? suggest(svc, cxMult, urgMult) : null;
  return (
    <>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
        {PRICE_TABLE.map((c, i) => <button key={c.cat} onClick={() => { setCatIdx(i); setSvc(null); }} style={calcChip(i === catIdx)}>{c.cat}</button>)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 18 }}>
        {cat.services.map((s) => {
          const on = svc && svc.name === s.name;
          return (
            <button key={s.name} onClick={() => setSvc(s)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, textAlign: "left", padding: "11px 14px", borderRadius: 11, cursor: "pointer", border: `1px solid ${on ? color.accent : color.line2}`, background: on ? color.accentTint : "#fff" }}>
              <span style={{ fontSize: 14, fontWeight: on ? 600 : 500, color: color.ink }}>{s.name}</span>
              <span style={{ fontSize: 12, color: color.gray400, flex: "none" }}>por {s.unit}</span>
            </button>
          );
        })}
      </div>
      {r ? (
        <>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 18 }}>
            <div>
              <div style={calcLabel}>Complexidade</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{COMPLEXITY.map((c) => <button key={c.key} onClick={() => setCx(c.key)} title={c.hint} style={calcChip(cx === c.key)}>{c.label}</button>)}</div>
            </div>
            <div>
              <div style={calcLabel}>Prazo</div>
              <div style={{ display: "flex", gap: 6 }}>{URGENCY.map((u) => <button key={u.key} onClick={() => setUrg(u.key)} style={calcChip(urg === u.key)}>{u.label}</button>)}</div>
            </div>
          </div>
          <div style={{ background: "linear-gradient(180deg, " + color.accentTint + " 0%, #fff 90%)", border: `1px solid ${color.accentLine}`, borderRadius: 14, padding: "18px 20px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: color.accentInk, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><Sparkles size={13} strokeWidth={2.2} />Faixa por {r.unit}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontFamily: font.body, fontWeight: 700, fontSize: 30, letterSpacing: "-0.02em", color: color.ink, fontVariantNumeric: "tabular-nums" }}>{fmtBRL(r.typ)}</span>
              <span style={{ fontSize: "13.5px", color: color.gray500 }}>comum {fmtBRL(r.min)} a {fmtBRL(r.max)}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => onApply(svc.name, r.typ)} className="db-btn db-btn-dark" style={{ fontSize: 14, padding: "11px 18px" }}>{applyLabel} {fmtBRL(r.typ)}</button>
            <button onClick={() => onApply(svc.name, r.min)} className="db-btn db-btn-ghost" style={{ fontSize: 14, padding: "11px 16px" }}>{applyLabel} mínimo</button>
            <button onClick={() => onApply(svc.name, r.max)} className="db-btn db-btn-ghost" style={{ fontSize: 14, padding: "11px 16px" }}>{applyLabel} máximo</button>
          </div>
        </>
      ) : (
        <div style={{ fontSize: 13, color: color.gray400, textAlign: "center", padding: "8px 0 4px" }}>Selecione um serviço para ver a faixa.</div>
      )}
    </>
  );
}

// Núcleo reutilizado pelo modal (editor) e pela aba. Alterna entre "montar meu
// preço" (a partir dos seus custos) e "faixa de mercado" (referência).
function PriceCalcCore({ onApply, applyLabel = "Usar", scope }) {
  const [mode, setMode] = useState("build");
  const tab = (key, label) => (
    <button onClick={() => setMode(key)} style={{ flex: 1, fontSize: "13.5px", fontWeight: 600, padding: "9px 0", borderRadius: 8, cursor: "pointer", border: "none", background: mode === key ? "#fff" : "transparent", color: mode === key ? color.ink : color.gray500, boxShadow: mode === key ? "0 1px 2px rgba(0,0,0,0.08)" : "none" }}>{label}</button>
  );
  return (
    <>
      <div style={{ display: "flex", gap: 3, background: color.surface, border: `1px solid ${color.gray200}`, borderRadius: 10, padding: 3, marginBottom: 18 }}>
        {tab("build", "Montar meu preço")}
        {tab("market", "Faixa de mercado")}
      </div>
      {mode === "build"
        ? <CostBuilder key={scope || "anon"} onApply={onApply} applyLabel={applyLabel} scope={scope} />
        : <MarketTable onApply={onApply} applyLabel={applyLabel} />}
    </>
  );
}

// Aba dedicada: mesma calculadora, e "Usar" abre uma proposta nova com o item.
function CalculatorPanel({ onNewProposal, scope }) {
  return (
    <div className="db-pad" style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 27, letterSpacing: "-0.02em", margin: "0 0 4px" }}>Calculadora de preço</h1>
        <p style={{ fontSize: "14.5px", color: color.gray500, margin: 0 }}>Monte o preço a partir dos seus custos reais, ou compare com a faixa do mercado. Suas ferramentas e o valor da hora ficam salvos pra próxima.</p>
      </div>
      <div style={{ background: "#fff", border: `1px solid ${color.line2}`, borderRadius: 16, padding: "22px 24px" }}>
        <PriceCalcCore onApply={onNewProposal} applyLabel="Criar proposta com" scope={scope} />
      </div>
    </div>
  );
}

function PriceCalculator({ onClose, onApply, scope }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 320, background: "rgba(10,10,12,0.55)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Calculadora de preço" style={{ width: "100%", maxWidth: 560, maxHeight: "86vh", overflow: "auto", background: "#fff", borderRadius: 18, padding: "24px 26px 22px", boxShadow: "0 40px 90px -30px rgba(0,0,0,0.5)", position: "relative" }}>
        <button onClick={onClose} aria-label="Fechar" className="db-btn" style={{ position: "absolute", top: 14, right: 14, background: "none", color: color.gray400, padding: 4 }}><X size={19} strokeWidth={2} /></button>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ width: 34, height: 34, flex: "none", borderRadius: 9, background: color.accentTint, color: color.accentInk, display: "flex", alignItems: "center", justifyContent: "center" }}><Calculator size={17} strokeWidth={2} /></span>
          <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 19, letterSpacing: "-0.01em" }}>Calculadora de preço</div>
        </div>
        <p style={{ fontSize: "13.5px", color: color.gray500, margin: "0 0 18px" }}>Monte o preço pelos seus custos ou veja a faixa de mercado.</p>
        <PriceCalcCore onApply={onApply} applyLabel="Usar" scope={scope} />
      </div>
    </div>
  );
}

// Botão de recarregar dados (F5 só do conteúdo). Após 10 cliques seguidos,
// entra em cooldown de 10s para não martelar o servidor.
function RefreshButton({ onRefresh, label = "Atualizar" }) {
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const clicks = useRef(0);
  const last = useRef(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);
  const click = async () => {
    if (busy || cooldown > 0) return;
    const now = Date.now();
    if (now - last.current > 5000) clicks.current = 0; // não eram cliques "seguidos"
    last.current = now;
    clicks.current += 1;
    if (clicks.current >= 10) { clicks.current = 0; setCooldown(10); }
    setBusy(true);
    try { await onRefresh(); } finally { setTimeout(() => setBusy(false), 350); }
  };
  const disabled = busy || cooldown > 0;
  return (
    <button onClick={click} disabled={disabled} aria-label={label} title={cooldown > 0 ? `Aguarde ${cooldown}s para atualizar de novo` : label} className="db-btn"
      style={{ flex: "none", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: color.gray600, background: "#fff", border: `1px solid ${color.gray200}`, borderRadius: 9, padding: "9px 11px", opacity: disabled ? 0.6 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>
      <RotateCcw size={15} strokeWidth={2.2} className={busy ? "db-rot" : undefined} />
      {cooldown > 0 ? `${cooldown}s` : ""}
    </button>
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
      if (!url) throw new Error("Não foi possível iniciar o checkout. Tente de novo em instantes.");
      window.location.href = url; // gateway do Mercado Pago
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
        <div style={{ marginTop: 14, textAlign: "center", fontSize: 12, color: color.gray400 }}>Pagamento seguro via Mercado Pago · Pix, cartão ou boleto</div>
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

  const firstPending = items.findIndex((it) => !steps[it.key]);

  return (
    <div className="db-onb">
      {/* Cabeçalho: título + selo de porcentagem */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
        <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em" }}>Comece a usar o Manda</div>
        <span style={{ flex: "none", fontSize: "12.5px", fontWeight: 700, color: color.accentInk, background: color.accentTint, padding: "4px 11px", borderRadius: 999, fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
      </div>
      <div style={{ fontSize: "13px", color: color.gray500, marginBottom: 13 }}>{doneCount} de {items.length} passos concluídos</div>
      <div className="db-onb-bar"><span style={{ width: `${pct}%` }} /></div>

      {/* Passos: concluído (check), atual (destacado + botão), próximos (esmaecidos + seta) */}
      <div style={{ marginTop: 16, border: `1px solid ${color.line2}`, borderRadius: 12, overflow: "hidden" }}>
        {items.map((it, idx) => {
          const ok = steps[it.key];
          const active = idx === firstPending;
          const clickable = !ok;
          return (
            <div
              key={it.key}
              className="db-onb-row"
              onClick={clickable ? it.action : undefined}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); it.action(); } } : undefined}
              style={{
                display: "flex", alignItems: "center", gap: 13, padding: "15px 16px",
                borderTop: idx === 0 ? "none" : `1px solid ${color.line2}`,
                background: active ? color.surface3 : "#fff",
                cursor: clickable ? "pointer" : "default",
                opacity: (!ok && !active) ? 0.6 : 1,
                transition: "background .15s ease",
              }}
            >
              <span style={{
                flex: "none", width: 26, height: 26, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: font.body, fontSize: 13, fontWeight: 700,
                background: ok ? "#22C55E" : active ? color.accent : "transparent",
                border: (ok || active) ? "none" : `1.5px solid ${color.gray200}`,
                color: (ok || active) ? "#fff" : color.gray500,
              }}>
                {ok ? <Check size={15} strokeWidth={3} /> : idx + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14.5px", fontWeight: 600, color: ok ? color.gray400 : color.ink, textDecoration: ok ? "line-through" : "none" }}>{it.title}</div>
                {active && <div style={{ fontSize: "12.5px", color: color.gray500, marginTop: 2 }}>{it.desc}</div>}
              </div>
              {ok ? (
                <span style={{ flex: "none", fontSize: "12.5px", fontWeight: 600, color: "#2E7D51" }}>Feito</span>
              ) : active ? (
                <button onClick={(e) => { e.stopPropagation(); it.action(); }} className="db-btn db-btn-dark db-onb-cta" style={{ flex: "none", fontSize: 13.5, padding: "8px 14px", gap: 4 }}>
                  {it.cta}<ChevronRight size={15} strokeWidth={2.4} />
                </button>
              ) : (
                <ChevronRight size={18} strokeWidth={2} color={color.gray400} style={{ flex: "none" }} />
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12, textAlign: "right" }}>
        <button onClick={onSkip} className="db-btn" style={{ background: "none", color: color.gray400, fontSize: "12.5px", padding: "4px 6px" }}>Pular tutorial</button>
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

const TPL_CATS = [
  ["todos", "Todos"],
  ["clean", "Clean"],
  ["vibrante", "Vibrantes"],
  ["foto", "Com foto"],
  ["escuro", "Escuros"],
  ["criativo", "Criativos"],
];
const BASIC_TPL_IDS = ["minimal", "bold"]; // espelha o plano Básico do backend

function DesignGallery({ onUse, plan, onUpgrade, scope }) {
  const [cat, setCat] = useState("todos");
  const list = cat === "todos" ? DESIGNS : DESIGNS.filter((d) => d.cat === cat);
  const showPro = plan === "basic" || plan === "free" || !plan;
  const isLocked = (id) => showPro && !BASIC_TPL_IDS.includes(id);
  // Selo "Novo" some de vez ao clicar (persistido por usuário no localStorage).
  // Relê quando o `scope` (email) fica disponível: na 1ª renderização o usuário
  // ainda não carregou, então sem isso a chave lida seria a errada (vazia) e o
  // selo voltaria a cada recarregamento.
  const [seen, setSeen] = useState(new Set());
  useEffect(() => {
    try { setSeen(new Set(JSON.parse(localStorage.getItem(tplSeenKey(scope)) || "[]"))); }
    catch { setSeen(new Set()); }
  }, [scope]);
  const markSeen = (id) => {
    setSeen((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev); next.add(id);
      try { localStorage.setItem(tplSeenKey(scope), JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  };
  const pick = (id) => { markSeen(id); isLocked(id) ? onUpgrade && onUpgrade() : onUse(id); };
  return (
    <div className="db-pad">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 27, letterSpacing: "-0.02em", margin: "0 0 4px" }}>Modelos de proposta</h1>
        <p style={{ fontSize: "14.5px", color: color.gray500, margin: 0 }}>Cada modelo é um design diferente. Escolha um e personalize a cor, a logo e os textos depois.</p>
      </div>

      <div className="db-dsn-chips" role="tablist" aria-label="Filtrar modelos por estilo">
        {TPL_CATS.map(([id, label]) => {
          const n = id === "todos" ? DESIGNS.length : DESIGNS.filter((d) => d.cat === id).length;
          return (
            <button key={id} role="tab" aria-selected={cat === id} onClick={() => setCat(id)} className={cat === id ? "db-dsn-chip on" : "db-dsn-chip"}>
              {label}<span className="db-dsn-chip-n">{n}</span>
            </button>
          );
        })}
      </div>

      <div className="db-dsn-grid">
        {list.map((d, i) => (
          <div key={d.id} className="db-dsn-card" style={{ animation: `dbUp .4s ${i * 0.05}s ease both` }}>
            <div className="db-dsn-thumb">
              <div style={{ position: "absolute", top: 0, left: "50%", width: 460, transform: "translateX(-50%) scale(0.62)", transformOrigin: "top center", pointerEvents: "none" }}>
                <ProposalDesign id={d.id} doc={sampleFor(d.id)} accent={d.accent} />
              </div>
              <div className="db-dsn-badges">
                {d.novo && !seen.has(d.id) && <span className="db-dsn-badge novo">Novo</span>}
                {isLocked(d.id) && <span className="db-dsn-badge pro"><Lock size={11} strokeWidth={2.4} style={{ marginRight: 4, verticalAlign: "-1px" }} />Pro</span>}
              </div>
              <div className="db-dsn-hover">
                <button onClick={() => pick(d.id)} className="db-btn db-dsn-cta">{isLocked(d.id) ? "Desbloquear no Pro" : "Usar este modelo"}</button>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px" }}>
              <div>
                <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 15 }}>{d.name}</div>
                <div style={{ fontSize: 12, color: color.gray400 }}>{d.tag}</div>
              </div>
              <button onClick={() => pick(d.id)} className="db-btn db-btn-dark" style={{ fontSize: "13.5px", padding: "9px 16px", display: "inline-flex", alignItems: "center", gap: 6 }}>{isLocked(d.id) ? <><Lock size={13} strokeWidth={2.2} />Pro</> : "Usar"}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClientsPanel({ rows, onRefresh }) {
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

  // Vínculo proposta → cliente. A chave é o EMAIL do cliente (identificador
  // natural: único e sem variação de grafia); sem email, cai no nome
  // normalizado (minúsculas, espaços colapsados). Empresa NÃO identifica:
  // clientes pessoa física não têm, e todos os vazios virariam um só.
  const normName = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
  const clientKey = (r) =>
    String(r.clientEmail || "").trim().toLowerCase() || normName(r.client) || "sem cliente";
  const map = {};
  filtered.forEach((r) => {
    const key = clientKey(r);
    if (!map[key]) map[key] = { client: (r.client || "Sem cliente").trim() || "Sem cliente", company: "", email: String(r.clientEmail || "").trim(), count: 0, value: 0, accepted: 0, opened: false, props: [] };
    const g = map[key];
    g.count += 1;
    g.value += num(r.value);
    g.props.push(r);
    if (OPENED.includes(r.status)) g.opened = true;
    if (r.status === "Aceita") g.accepted += 1;
    if (!g.company && r.company) g.company = r.company;
  });
  const clients = Object.values(map).sort((a, b) => b.value - a.value);
  const totalVal = clients.reduce((a, c) => a + c.value, 0);

  // Detalhe do cliente: link da proposta e download do PDF direto daqui.
  const [openClient, setOpenClient] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [pdfRow, setPdfRow] = useState(null);     // proposta renderizada oculta p/ virar PDF
  const [pdfBusyId, setPdfBusyId] = useState(null);
  const cliPdfRef = useRef(null);
  useEffect(() => {
    if (!openClient) return;
    const onKey = (e) => { if (e.key === "Escape") setOpenClient(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openClient]);

  const copyLinkFor = (r) => {
    if (!r.publicId) return;
    const url = `${window.location.origin}/p/${r.publicId}`;
    if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
    setCopiedId(r.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const downloadPdfFor = async (r) => {
    if (pdfBusyId) return;
    setPdfBusyId(r.id);
    setPdfRow(r);
    try {
      await new Promise((ok) => setTimeout(ok, 80)); // deixa o React montar a cópia oculta
      if (!cliPdfRef.current) return;
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const canvas = await html2canvas(cliPdfRef.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pw) / canvas.width;
      let left = imgH, pos = 0;
      pdf.addImage(img, "PNG", 0, pos, pw, imgH);
      left -= ph;
      while (left > 0) { pos -= ph; pdf.addPage(); pdf.addImage(img, "PNG", 0, pos, pw, imgH); left -= ph; }
      const name = String(r.client || r.title || "proposta").replace(/[^\w\s-]/g, "").trim().slice(0, 40) || "proposta";
      pdf.save(`proposta-${name}.pdf`);
    } catch { /* geração falhou: sem quebra, o usuário tenta de novo */ }
    finally { setPdfBusyId(null); setPdfRow(null); }
  };

  // Dinheiro com tipografia calma: "R$" pequeno e discreto, número na fonte de
  // texto (não no display pesado), com dígitos tabulares.
  const nf = (v) => new Intl.NumberFormat("pt-BR").format(num(v));
  const Money = ({ v, size = 24, tint }) => (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 5, fontVariantNumeric: "tabular-nums" }}>
      <span style={{ fontSize: Math.round(size * 0.52), fontWeight: 600, color: color.gray400, letterSpacing: "0.02em" }}>R$</span>
      <span style={{ fontFamily: font.body, fontSize: size, fontWeight: 650, letterSpacing: "-0.01em", color: tint || color.ink900 }}>{nf(v)}</span>
    </span>
  );
  const Kpi = ({ label, children }) => (
    <div style={{ background: "#fff", border: `1px solid ${color.line2}`, borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: color.gray400, marginBottom: 9 }}>{label}</div>
      <div style={{ minHeight: 29, display: "flex", alignItems: "baseline" }}>{children}</div>
    </div>
  );
  const YesNo = ({ on }) => on
    ? <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: "#EAF5EE", color: "#2E7D51" }}><Check size={13} strokeWidth={3} /></span>
    : <span style={{ color: color.gray300, fontSize: 15 }}>—</span>;

  return (
    <div className="db-pad">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 27, letterSpacing: "-0.02em", margin: "0 0 4px" }}>Clientes</h1>
          <p style={{ fontSize: "14.5px", color: color.gray500, margin: 0 }}>Acompanhe suas propostas por cliente e a receita do período.</p>
        </div>
        {onRefresh && <RefreshButton onRefresh={onRefresh} label="Atualizar clientes" />}
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
          <div style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 2, background: monthKey ? "#fff" : color.surface, border: `1px solid ${monthKey ? color.accent : color.gray200}`, borderRadius: 10, padding: "3px 30px 3px 12px", transition: "border-color .15s ease, background .15s ease" }}>
            <Calendar size={15} strokeWidth={2} color={monthKey ? color.accent : color.gray400} style={{ marginRight: 6, flex: "none" }} />
            <select value={selM} onChange={(e) => setSelM(e.target.value)} aria-label="Mês" style={{ fontFamily: font.body, fontSize: 13, fontWeight: 600, color: selM ? color.ink : color.gray500, background: "transparent", border: "none", outline: "none", padding: "7px 2px", cursor: "pointer", appearance: "none", WebkitAppearance: "none", MozAppearance: "none" }}>
              <option value="">Escolher mês</option>
              {MONTHS_FULL.map((m, i) => <option key={i} value={String(i + 1).padStart(2, "0")}>{m}</option>)}
            </select>
            {selM && (
              <select value={selY} onChange={(e) => setSelY(e.target.value)} aria-label="Ano" style={{ fontFamily: font.body, fontSize: 13, fontWeight: 600, color: color.ink, background: "transparent", border: "none", outline: "none", padding: "7px 2px", cursor: "pointer", appearance: "none", WebkitAppearance: "none", MozAppearance: "none" }}>
                {YEARS.map((y) => <option key={y} value={String(y)}>{y}</option>)}
              </select>
            )}
            <ChevronDown size={15} strokeWidth={2.2} color={monthKey ? color.accent : color.gray400} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          </div>
          {monthKey && (
            <button onClick={() => setSelM("")} className="db-btn" aria-label="Limpar mês" style={{ fontSize: 12.5, fontWeight: 600, color: color.gray500, background: "none", padding: "6px 8px", gap: 5 }}>
              <X size={13} strokeWidth={2.4} />Limpar
            </button>
          )}
        </div>
      </div>

      <div className="db-kpi-grid">
        <Kpi label="Receita"><Money v={receita} tint={receita > 0 ? "#2E7D51" : undefined} /></Kpi>
        <Kpi label="Em aberto"><Money v={emAberto} /></Kpi>
        <Kpi label="Propostas enviadas"><span style={{ fontFamily: font.body, fontSize: 24, fontWeight: 650, letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums" }}>{enviadas}</span></Kpi>
        <Kpi label="Conversão"><span style={{ fontFamily: font.body, fontSize: 24, fontWeight: 650, letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums" }}>{conv}<span style={{ fontSize: 14, fontWeight: 600, color: color.gray400, marginLeft: 2 }}>%</span></span></Kpi>
      </div>

      {clients.length ? (
        <div className="db-cli-wrap">
          <div className="db-cli-head">
            <span>Cliente</span><span>Propostas</span><span>Abriu</span><span>Aceitou</span><span style={{ textAlign: "right" }}>Valor total</span>
          </div>
          {clients.map((c, i) => (
            <div key={i} className="db-cli-row" role="button" tabIndex={0} onClick={() => setOpenClient(c)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpenClient(c); } }}
              aria-label={`Ver propostas de ${c.client}`} style={{ cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <span style={{ width: 34, height: 34, flex: "none", borderRadius: 9, background: avatarPalette[i % 4].bg, color: avatarPalette[i % 4].ink, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.heading, fontWeight: 700, fontSize: "12.5px" }}>{initials(c.client)}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.client}</div>
                  <div style={{ fontSize: "12.5px", color: color.gray400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.company || c.email || "—"}</div>
                </div>
              </div>
              <span style={{ fontSize: 14, color: color.gray700, fontVariantNumeric: "tabular-nums" }}>{c.count}</span>
              <span><YesNo on={c.opened} /></span>
              <span>{c.accepted ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "11.5px", fontWeight: 600, color: "#2E7D51" }}><Check size={13} strokeWidth={3} />{c.accepted}</span> : <YesNo on={false} />}</span>
              <span className="db-tip" data-tip={totalVal > 0 ? `${Math.round((c.value / totalVal) * 100)}% do valor total do período` : "Sem valores no período"} style={{ display: "flex", justifyContent: "flex-end" }}>
                <Money v={c.value} size={14.5} />
              </span>
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

      {/* Detalhe do cliente: propostas com link e PDF */}
      {openClient && (
        <div onClick={() => setOpenClient(null)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(10,10,12,0.55)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Propostas de ${openClient.client}`} style={{ width: "100%", maxWidth: 560, maxHeight: "82vh", overflow: "auto", background: "#fff", borderRadius: 18, padding: "26px 26px 24px", boxShadow: "0 40px 90px -30px rgba(0,0,0,0.5)", position: "relative" }}>
            <button onClick={() => setOpenClient(null)} aria-label="Fechar" className="db-btn" style={{ position: "absolute", top: 14, right: 14, background: "none", color: color.gray400, padding: 4 }}><X size={19} strokeWidth={2} /></button>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
              <span style={{ width: 40, height: 40, flex: "none", borderRadius: 11, background: color.accentTint, color: color.accentInk, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.heading, fontWeight: 700, fontSize: 14 }}>{initials(openClient.client)}</span>
              <div>
                <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 19, letterSpacing: "-0.01em" }}>{openClient.client}</div>
                {(openClient.company || openClient.email) && <div style={{ fontSize: 13, color: color.gray500 }}>{openClient.company || openClient.email}</div>}
              </div>
            </div>
            <p style={{ fontSize: "13.5px", color: color.gray500, margin: "10px 0 18px" }}>{openClient.props.length} {openClient.props.length === 1 ? "proposta no período" : "propostas no período"}. Copie o link ou baixe o PDF.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {openClient.props.map((r) => {
                const sc = statusColors[r.status] || statusColors.Rascunho;
                return (
                  <div key={r.id} style={{ border: `1px solid ${color.line2}`, borderRadius: 13, padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title || "Proposta sem título"}</div>
                        <div style={{ fontSize: 12, color: color.gray400, marginTop: 2 }}>{r.date}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
                        <Money v={r.value} size={14.5} />
                        <span style={{ fontSize: "11px", fontWeight: 600, color: sc.c, background: sc.bg, border: `1px solid ${sc.b}`, borderRadius: 999, padding: "3px 9px" }}>{r.status}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {r.publicId ? (
                        <button onClick={() => copyLinkFor(r)} className="db-btn db-btn-ghost" style={{ fontSize: 13, padding: "8px 13px", color: copiedId === r.id ? "#2E7D51" : undefined }}>
                          {copiedId === r.id ? <><Check size={14} strokeWidth={2.6} />Copiado!</> : <><Link2 size={14} strokeWidth={2.2} />Copiar link</>}
                        </button>
                      ) : (
                        <span style={{ fontSize: "12.5px", color: color.gray400, alignSelf: "center" }}>Rascunho ainda sem link</span>
                      )}
                      <button onClick={() => downloadPdfFor(r)} disabled={!!pdfBusyId} className="db-btn db-btn-ghost" style={{ fontSize: 13, padding: "8px 13px" }}>
                        <Download size={14} strokeWidth={2.2} />{pdfBusyId === r.id ? "Gerando…" : "Baixar PDF"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Cópia oculta da proposta escolhida, só para gerar o PDF */}
      {pdfRow && (
        <div ref={cliPdfRef} aria-hidden="true" style={{ position: "fixed", left: -99999, top: 0, width: 720, background: "#fff", padding: 24, pointerEvents: "none", zIndex: -1 }}>
          <ProposalDesign id={pdfRow.template} doc={pdfRow} accent={pdfRow.accent} />
        </div>
      )}
    </div>
  );
}

function SettingsPanel({ user, setUser, go, pushToast, usage }) {
  const [name, setName] = useState(user?.name || "");
  const [savingName, setSavingName] = useState(false);
  const [pw, setPw] = useState({ next: "", confirm: "", code: "" });
  const [pwStage, setPwStage] = useState("form"); // "form" (define a senha) → "code" (valida o código)
  const [pwCodeStatus, setPwCodeStatus] = useState(""); // "" | "error" | "success"
  const [sendingCode, setSendingCode] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pwErr, setPwErr] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [bio, setBio] = useState(() => { try { return localStorage.getItem(bioKeyFor(user?.email)) || ""; } catch { return ""; } });
  const [stats, setStats] = useState(null);
  const [toastsOn, setToastsOn] = useState(() => toastsEnabled(user?.email));
  const [gmail, setGmail] = useState(null); // { configured, connected, email }
  const [gmailBusy, setGmailBusy] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
    setToastsOn(toastsEnabled(user?.email));
    try { setBio(localStorage.getItem(bioKeyFor(user?.email)) || ""); } catch { /* ignore */ }
  }, [user]);
  useEffect(() => { api.stats().then(setStats).catch(() => {}); }, []);

  // Status da conexão de Gmail + resultado do fluxo OAuth (?gmail=...).
  useEffect(() => {
    api.gmailStatus().then(setGmail).catch(() => {});
    try {
      const g = new URLSearchParams(window.location.search).get("gmail");
      if (g) {
        const map = {
          conectado: ["Gmail conectado. Agora você envia propostas pelo seu e-mail.", "success"],
          erro: ["Não foi possível conectar o Gmail. Tente de novo.", "info"],
          cancelado: ["Conexão com o Gmail cancelada.", "info"],
          sem_refresh: ["O Google não liberou o envio. Remova o acesso do Manda na sua Conta Google e conecte de novo.", "info"],
        };
        const m = map[g];
        if (m && pushToast) pushToast(m[0], m[1]);
        window.history.replaceState({}, "", "/app/configuracoes");
      }
    } catch { /* ignore */ }
  }, []);

  const connectGmail = async () => {
    setGmailBusy(true);
    try {
      const { url } = await api.gmailConnectUrl();
      window.location.href = url; // vai ao Google e volta para /app/configuracoes?gmail=...
    } catch (e) {
      setGmailBusy(false);
      if (pushToast) pushToast(e.message || "Não foi possível iniciar a conexão.", "info");
    }
  };
  const disconnectGmail = async () => {
    setGmailBusy(true);
    try {
      await api.gmailDisconnect();
      setGmail((g) => ({ ...(g || {}), connected: false, email: null }));
      if (pushToast) pushToast("Gmail desconectado.", "success");
    } catch (e) { if (pushToast) pushToast(e.message || "Não foi possível desconectar.", "info"); }
    finally { setGmailBusy(false); }
  };

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

  // Passo 1: valida a nova senha localmente e pede o código de confirmação por email.
  const requestPwCode = async () => {
    setPwErr("");
    if (pw.next.length < 8) return setPwErr("A nova senha precisa de ao menos 8 caracteres.");
    if (pw.next !== pw.confirm) return setPwErr("A confirmação não bate com a nova senha.");
    setSendingCode(true);
    try {
      await api.requestPasswordCode();
      setPwStage("code");
      if (pushToast) pushToast("Enviamos um código de confirmação para o seu email.", "success");
    } catch (e) { setPwErr(e.message || "Não foi possível enviar o código."); }
    finally { setSendingCode(false); }
  };

  // Passo 2: confirma o código e efetiva a troca. Roda sozinho no 6º dígito.
  const savePassword = async (codeArg) => {
    const code = (typeof codeArg === "string" ? codeArg : pw.code).trim();
    if (savingPw || pwCodeStatus === "success") return;
    setPwErr("");
    if (!code) return setPwErr("Digite o código que enviamos por email.");
    setSavingPw(true);
    try {
      await api.changePassword({ code, next: pw.next });
      setPwCodeStatus("success");
      if (pushToast) pushToast("Senha alterada com sucesso.", "success");
      setTimeout(() => { setPw({ next: "", confirm: "", code: "" }); setPwStage("form"); setPwCodeStatus(""); }, 800);
    } catch (e) {
      setPwCodeStatus("error");
      setPwErr(e.message || "Não foi possível trocar a senha.");
      setTimeout(() => { setPwCodeStatus(""); setPw((p) => ({ ...p, code: "" })); }, 600);
    } finally { setSavingPw(false); }
  };

  const saveDefaults = () => {
    try { localStorage.setItem(bioKeyFor(user?.email), bio); } catch { /* ignore */ }
    if (pushToast) pushToast("Padrão da proposta salvo.", "success");
  };
  const logout = () => { setToken(null); if (go) go("landing"); };

  const toggleToasts = () => {
    const next = !toastsOn;
    setToastsOn(next);
    try { localStorage.setItem(toastPrefKey(user?.email), next ? "on" : "off"); } catch { /* ignore */ }
    if (pushToast && next) pushToast("Pop-ups ativados. Assim que um cliente interagir, você vê um destes.", "success");
  };

  const isAdmin = user?.role === "admin";
  const plan = user?.plan || "free";
  const planLabel = isAdmin ? "Admin" : ({ free: "Sem assinatura", basic: "Básico", pro: "Pro", business: "Business" }[plan] || plan);
  const k = stats?.kpis;

  // Uso do mês (cota real do backend, não burlável).
  const unlimited = usage && usage.limit == null;
  const uUsed = usage?.used || 0;
  const uLimit = usage?.limit || 0;
  const uPct = unlimited ? 100 : uLimit ? Math.min(100, Math.round((uUsed / uLimit) * 100)) : 0;
  const nearLimit = !unlimited && uLimit > 0 && uUsed / uLimit >= 0.8;

  const card = { background: "#fff", border: `1px solid ${color.line2}`, borderRadius: 14, padding: "22px 24px" };
  const hTitle = { fontFamily: font.heading, fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em", marginBottom: 4 };
  const subTxt = { fontSize: "13.5px", color: color.gray500, margin: "0 0 18px" };
  const fieldLabel = { fontSize: 13, fontWeight: 600, color: color.gray700, display: "block", marginBottom: 6 };
  const pwPatch = (key) => (e) => setPw((p) => ({ ...p, [key]: e.target.value }));
  const nameDirty = name.trim() && name.trim() !== (user?.name || "");
  const nf = (v) => new Intl.NumberFormat("pt-BR").format(Number(v) || 0);
  const Stat = ({ label, value, money, tint }) => (
    <div style={{ background: color.surface3, borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: color.gray400, marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 5, fontFamily: font.body, fontWeight: 650, fontSize: 21, letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums", color: tint || color.ink900 }}>
        {money && <span style={{ fontSize: 12, fontWeight: 600, color: color.gray400 }}>R$</span>}
        {money ? nf(value) : value}
      </div>
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
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <span style={{ width: 52, height: 52, flex: "none", borderRadius: "50%", background: color.accentTint, color: color.accentInk, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.heading, fontWeight: 700, fontSize: 18 }}>
              {user ? initials(user.name) : <User size={22} strokeWidth={2} />}
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name || "Sua conta"}</div>
              <div style={{ fontSize: "13.5px", color: color.gray500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email || "Não conectado"}</div>
            </div>
            <span style={{ flex: "none", fontFamily: font.body, fontSize: 12.5, fontWeight: 600, color: plan === "free" ? color.gray500 : "#fff", background: plan === "free" ? "transparent" : color.ink, border: plan === "free" ? `1px solid ${color.gray200}` : "none", padding: "6px 12px", borderRadius: 8 }}>{planLabel}</span>
          </div>
          <label style={fieldLabel}>Nome de exibição</label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveName(); }} maxLength={120} placeholder="Seu nome" style={{ ...inp(), flex: 1, minWidth: 200 }} />
            <button onClick={saveName} disabled={!nameDirty || savingName} className="db-btn db-btn-dark" style={{ fontSize: 14, padding: "0 18px", opacity: nameDirty ? 1 : 0.55 }}>{savingName ? "Salvando…" : "Salvar"}</button>
          </div>
          <div style={{ fontSize: 12, color: color.gray400, marginTop: 7 }}>É o nome que aparece para os seus clientes.</div>
        </div>

        <div style={card}>
          <div style={hTitle}>Segurança</div>
          <p style={subTxt}>Para trocar a senha, enviamos um código para o seu email e você confirma aqui.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 380 }}>
            <div>
              <label style={fieldLabel}>Nova senha</label>
              <input type={showPw ? "text" : "password"} value={pw.next} onChange={pwPatch("next")} disabled={pwStage === "code"} autoComplete="new-password" placeholder="Ao menos 8 caracteres" style={{ ...inp(), opacity: pwStage === "code" ? 0.6 : 1 }} />
            </div>
            <div>
              <label style={fieldLabel}>Confirmar nova senha</label>
              <input type={showPw ? "text" : "password"} value={pw.confirm} onChange={pwPatch("confirm")} disabled={pwStage === "code"} autoComplete="new-password" placeholder="Repita a nova senha" style={{ ...inp(), opacity: pwStage === "code" ? 0.6 : 1 }} />
            </div>
            <button type="button" onClick={() => setShowPw((v) => !v)} className="db-btn" style={{ alignSelf: "flex-start", background: "none", color: color.gray500, fontSize: 12.5, padding: "2px 4px", gap: 6 }}>
              <Eye size={14} strokeWidth={2} />{showPw ? "Ocultar senhas" : "Mostrar senhas"}
            </button>

            {pwStage === "code" && (
              <div style={{ borderTop: `1px solid ${color.line2}`, paddingTop: 14, marginTop: 2 }}>
                <label style={fieldLabel}>Código enviado para {user?.email}</label>
                <CodeInput value={pw.code} onChange={(v) => { setPw((p) => ({ ...p, code: v })); if (pwErr) setPwErr(""); }} status={pwCodeStatus} disabled={savingPw || pwCodeStatus === "success"} autoFocus />
                <button type="button" onClick={requestPwCode} disabled={sendingCode} className="db-btn" style={{ background: "none", color: color.gray500, fontSize: 12.5, padding: "6px 2px 0", gap: 6 }}>
                  <RotateCcw size={13} strokeWidth={2} />{sendingCode ? "Reenviando…" : "Reenviar código"}
                </button>
              </div>
            )}

            {pwErr && <div role="alert" style={{ fontSize: 13, color: "#B4443C", background: "#FDECEA", border: "1px solid #F5D2CD", padding: "9px 11px", borderRadius: 9 }}>{pwErr}</div>}

            {pwStage === "form" ? (
              <button onClick={requestPwCode} disabled={sendingCode || !pw.next || !pw.confirm} className="db-btn db-btn-dark" style={{ alignSelf: "flex-start", fontSize: 14, padding: "10px 18px" }}>
                <Mail size={14} strokeWidth={2.2} />{sendingCode ? "Enviando…" : "Enviar código"}
              </button>
            ) : (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={savePassword} disabled={savingPw || pw.code.trim().length < 6} className="db-btn db-btn-dark" style={{ fontSize: 14, padding: "10px 18px" }}><Lock size={14} strokeWidth={2.2} />{savingPw ? "Trocando…" : "Confirmar troca"}</button>
                <button onClick={() => { setPwStage("form"); setPw((p) => ({ ...p, code: "" })); setPwErr(""); }} className="db-btn db-btn-ghost" style={{ fontSize: 14, padding: "10px 16px" }}>Cancelar</button>
              </div>
            )}
          </div>
        </div>

        <div style={card}>
          <div style={hTitle}>Enviar por e-mail</div>
          <p style={subTxt}>Conecte seu Gmail para mandar as propostas pelo seu próprio e-mail. O cliente recebe direto de você, e as respostas dele voltam pra sua caixa.</p>
          {gmail && gmail.connected ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "13.5px", fontWeight: 600, color: "#2E7D51", background: "#EAF6EF", border: "1px solid #CDE9D8", padding: "8px 12px", borderRadius: 9 }}>
                <Check size={15} strokeWidth={2.6} />Conectado: {gmail.email}
              </span>
              <button onClick={disconnectGmail} disabled={gmailBusy} className="db-btn db-btn-ghost" style={{ fontSize: 14, padding: "9px 16px" }}>{gmailBusy ? "…" : "Desconectar"}</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <button onClick={connectGmail} disabled={gmailBusy || (gmail && !gmail.configured)} className="db-btn db-btn-dark" style={{ fontSize: 14, padding: "10px 18px" }}>
                <Mail size={15} strokeWidth={2.2} />{gmailBusy ? "Abrindo…" : "Conectar Gmail"}
              </button>
              {gmail && !gmail.configured && <span style={{ fontSize: "12.5px", color: color.gray400 }}>Envio por e-mail ainda não ativado no servidor.</span>}
            </div>
          )}
        </div>

        <div style={card}>
          <div style={hTitle}>Plano e uso</div>
          <p style={subTxt}>Sua cota do mês e a gestão da assinatura.</p>
          {plan === "free" ? (
            <p style={{ fontSize: 14, color: color.gray600, margin: "0 0 14px" }}>Você ainda não tem um plano ativo. Assine para criar e enviar propostas.</p>
          ) : (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <span style={{ fontSize: "13.5px", fontWeight: 600, color: color.gray700 }}>
                  {unlimited ? "Propostas ilimitadas" : `${uUsed} de ${uLimit} propostas usadas`}
                </span>
                <span style={{ fontSize: 12, color: nearLimit ? "#B4443C" : color.gray400 }}>
                  {isAdmin ? "Admin" : unlimited ? "Business" : nearLimit ? "Perto do limite" : "Renova todo mês"}
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: color.surface, overflow: "hidden" }}>
                <span style={{ display: "block", height: "100%", width: `${uPct}%`, borderRadius: 999, background: unlimited ? "#2E7D51" : nearLimit ? "#B4443C" : color.accent, transition: "width .4s cubic-bezier(.2,.8,.2,1)" }} />
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {isAdmin ? (
              <span style={{ fontSize: "13px", color: color.gray500 }}>Conta de administrador: acesso total, sem cobrança.</span>
            ) : plan === "free" ? (
              <button onClick={() => go && go("pricing")} className="db-btn db-btn-accent" style={{ fontSize: 14, padding: "10px 18px" }}>Ver planos</button>
            ) : (
              <>
                <button onClick={() => go && go("pricing")} className="db-btn db-btn-accent" style={{ fontSize: 14, padding: "10px 18px" }}>Renovar acesso</button>
                <button onClick={() => go && go("pricing")} className="db-btn" style={{ fontSize: 14, padding: "10px 14px", background: "none", color: color.gray500, fontWeight: 600 }}>Trocar de plano</button>
              </>
            )}
          </div>
        </div>

        <div style={card}>
          <div style={hTitle}>Seus números</div>
          <p style={subTxt}>Um resumo das suas propostas.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            <Stat label="Enviadas" value={k ? k.enviadas : "—"} />
            <Stat label="Aceitas" value={k ? k.aceitas : "—"} tint="#2E7D51" />
            <Stat label="Conversão" value={k ? `${k.conversao}%` : "—"} />
            <Stat label="Ticket médio" value={k ? (k.aceitas ? Math.round(k.receita / k.aceitas) : 0) : "—"} money={!!k} />
            <Stat label="Receita do mês" value={k ? k.receita : "—"} money={!!k} tint="#2E7D51" />
            <Stat label="Em aberto" value={k ? k.emAberto : "—"} money={!!k} />
          </div>
        </div>

        <div style={card}>
          <div style={hTitle}>Padrões da proposta</div>
          <p style={subTxt}>Preenchido automaticamente em cada proposta nova.</p>
          <label style={fieldLabel}>Sobre mim (padrão)</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={LIMITS.bio} rows={3} placeholder="Uma breve apresentação sua, usada em toda proposta." style={{ ...inp(), resize: "vertical", lineHeight: 1.5 }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 12 }}>
            <button onClick={saveDefaults} className="db-btn db-btn-dark" style={{ fontSize: 14, padding: "10px 18px" }}>Salvar padrão</button>
            <span style={{ fontSize: 12, color: color.gray400, fontVariantNumeric: "tabular-nums" }}>{bio.length}/{LIMITS.bio}</span>
          </div>
        </div>

        <div style={card}>
          <div style={hTitle}>Notificações</div>
          <p style={subTxt}>Como você fica sabendo das interações dos clientes.</p>
          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, cursor: "pointer" }}>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 600 }}>Pop-ups na tela</span>
              <span style={{ display: "block", fontSize: "12.5px", color: color.gray500, marginTop: 2 }}>Um aviso rápido aparece quando um cliente abre ou responde uma proposta. A aba Notificações registra tudo mesmo com isso desligado.</span>
            </span>
            <span className="db-sw">
              <input type="checkbox" checked={toastsOn} onChange={toggleToasts} aria-label="Ativar pop-ups de interação" />
              <i />
            </span>
          </label>
        </div>

        <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div>
            <div style={hTitle}>Sessão</div>
            <p style={{ ...subTxt, margin: 0 }}>Encerra sua sessão neste dispositivo.</p>
          </div>
          <button onClick={logout} className="db-btn db-btn-ghost" style={{ fontSize: 14, padding: "10px 18px", flex: "none" }}><LogOut size={15} strokeWidth={2} />Sair da conta</button>
        </div>
      </div>
    </div>
  );
}
