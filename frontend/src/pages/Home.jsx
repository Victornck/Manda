// Home — a primeira tela depois do login. Um panorama do negócio do usuário:
// KPIs, gráfico de propostas no tempo, funil, atividade recente, clientes quentes,
// ranking de templates e insights. Consome GET /proposals/dashboard (agregado no
// servidor pra não pesar no egress). Sem lib de gráfico: o gráfico é SVG na mão.
//
// Reaproveita 100% dos tokens do design (theme.js). Nada de cor/gradiente novo.
import { useEffect, useMemo, useState } from "react";
import {
  Plus, FileText, Eye, Check, X, Send, Clock, Users, Calculator, LayoutGrid,
  Sparkles, ArrowRight, Flame, TrendingUp, TrendingDown, Minus, RefreshCw,
} from "lucide-react";
import { font, color, statusColors } from "../theme.js";
import { api } from "../lib/api.js";
import { formatMoney, CURRENCY_LIST, currencyOf, DEFAULT_CURRENCY } from "../lib/currency.js";

// Nomes amigáveis dos templates (as chaves vêm cruas do banco).
const TEMPLATE_LABELS = {
  minimal: "Minimalista", bold: "Ousado", editorial: "Editorial", colorido: "Colorido",
  capa: "Com capa", dossie: "Dossiê", carta: "Carta", aurora: "Aurora",
  studio: "Studio", recibo: "Recibo", grande: "Grande", poster: "Pôster",
};
const tplLabel = (k) => TEMPLATE_LABELS[k] || (k ? k[0].toUpperCase() + k.slice(1) : "—");

// Metadados de cada tipo de evento na linha do tempo.
const ACT = {
  viewed:   { verb: "abriu a proposta",     Icon: Eye,  ...statusColors.Visualizada },
  accepted: { verb: "aceitou a proposta",   Icon: Check, ...statusColors.Aceita },
  declined: { verb: "recusou a proposta",   Icon: X,     ...statusColors.Recusada },
  emailed:  { verb: "recebeu por e-mail",   Icon: Send,  ...statusColors.Enviada },
};

const FILTERS = [{ d: 7, l: "7 dias" }, { d: 30, l: "30 dias" }, { d: 90, l: "90 dias" }, { d: 365, l: "1 ano" }];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}
const firstName = (name = "") => (name.trim().split(" ")[0] || "");
const today = () => new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

function ago(iso) {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "agora";
  const m = Math.floor(s / 60); if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60); if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24); if (d < 30) return `há ${d} dia${d > 1 ? "s" : ""}`;
  const mo = Math.floor(d / 30); return `há ${mo} ${mo > 1 ? "meses" : "mês"}`;
}

// Card base — mesmo desenho em toda a Home.
function Card({ children, style, pad = 20 }) {
  return (
    <div style={{ background: color.white, border: `1px solid ${color.line2}`, borderRadius: 16, padding: pad, ...style }}>
      {children}
    </div>
  );
}

// Preenche todos os dias da janela (zera onde não houve proposta) pro eixo do
// gráfico ser contínuo, não só os dias com dado.
function fullSeries(serie, days) {
  const map = new Map((serie || []).map((s) => [s.dia, s.n]));
  const out = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: d, n: map.get(key) || 0 });
  }
  return out;
}

// Gráfico de área + linha, SVG puro. Sem tooltip (mantém leve e previsível).
function Chart({ serie, days }) {
  const pts = fullSeries(serie, days);
  const W = 760, H = 240, padL = 34, padR = 16, padT = 18, padB = 26;
  const iw = W - padL - padR, ih = H - padT - padB;
  const max = Math.max(1, ...pts.map((p) => p.n));
  const total = pts.reduce((a, p) => a + p.n, 0);
  const x = (i) => padL + (pts.length <= 1 ? iw / 2 : (i * iw) / (pts.length - 1));
  const y = (n) => padT + (1 - n / max) * ih;
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.n).toFixed(1)}`).join(" ");
  const area = `${line} L${x(pts.length - 1).toFixed(1)},${(padT + ih).toFixed(1)} L${x(0).toFixed(1)},${(padT + ih).toFixed(1)} Z`;
  const grid = [0, 0.5, 1]; // linhas de 0, meio e topo
  const fmt = (d) => d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
        <span style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 24, letterSpacing: "-0.02em" }}>{total}</span>
        <span style={{ fontSize: 13, color: color.gray500 }}>proposta{total !== 1 ? "s" : ""} criada{total !== 1 ? "s" : ""} no período</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id="hm-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color.accent} stopOpacity="0.16" />
            <stop offset="100%" stopColor={color.accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        {grid.map((g, i) => {
          const gy = padT + g * ih;
          const val = Math.round(max * (1 - g));
          return (
            <g key={i}>
              <line x1={padL} y1={gy} x2={W - padR} y2={gy} stroke={color.line2} strokeWidth="1" />
              <text x={padL - 8} y={gy + 3.5} textAnchor="end" fontSize="10.5" fill={color.gray400}>{val}</text>
            </g>
          );
        })}
        <path d={area} fill="url(#hm-fill)" />
        <path d={line} fill="none" stroke={color.accent} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        {pts.length <= 62 && pts.map((p, i) => p.n > 0 && (
          <circle key={i} cx={x(i)} cy={y(p.n)} r="2.6" fill={color.white} stroke={color.accent} strokeWidth="2" />
        ))}
        <text x={padL} y={H - 6} fontSize="10.5" fill={color.gray400}>{fmt(pts[0].date)}</text>
        <text x={W - padR} y={H - 6} textAnchor="end" fontSize="10.5" fill={color.gray400}>{fmt(pts[pts.length - 1].date)}</text>
      </svg>
    </div>
  );
}

// Funil vertical de estágios com barras proporcionais.
function Funnel({ funil }) {
  const stages = [
    { key: "rascunho", label: "Rascunho", n: funil.rascunho, ...statusColors.Rascunho },
    { key: "enviada", label: "Enviada", n: funil.enviada, ...statusColors.Enviada },
    { key: "visualizada", label: "Visualizada", n: funil.visualizada, ...statusColors.Visualizada },
    { key: "aceita", label: "Aceita", n: funil.aceita, ...statusColors.Aceita },
  ];
  const max = Math.max(1, ...stages.map((s) => s.n));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {stages.map((s) => (
        <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 84, flex: "none", fontSize: 13, color: color.gray600, fontWeight: 500 }}>{s.label}</span>
          <div style={{ flex: 1, height: 26, background: color.surface, borderRadius: 8, overflow: "hidden" }}>
            <div style={{ width: `${Math.max(s.n ? 6 : 0, (s.n / max) * 100)}%`, height: "100%", background: s.bg, borderRight: s.n ? `2px solid ${s.b}` : "none", transition: "width .4s ease" }} />
          </div>
          <span style={{ width: 26, flex: "none", textAlign: "right", fontFamily: font.heading, fontWeight: 700, fontSize: 15, color: s.c }}>{s.n}</span>
        </div>
      ))}
      {funil.recusada > 0 && (
        <div style={{ fontSize: 12.5, color: color.gray500, marginTop: 2 }}>
          {funil.recusada} recusada{funil.recusada > 1 ? "s" : ""} no total.
        </div>
      )}
    </div>
  );
}

// KPI — um número grande com rótulo e, opcionalmente, uma variação.
function Kpi({ label, value, hint, delta }) {
  const up = delta > 0, down = delta < 0;
  const DIcon = up ? TrendingUp : down ? TrendingDown : Minus;
  const dc = up ? statusColors.Aceita.c : down ? statusColors.Recusada.c : color.gray400;
  return (
    <Card pad={18} style={{ minWidth: 0 }}>
      <div style={{ fontSize: 12.5, color: color.gray500, fontWeight: 500, marginBottom: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 25, letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</span>
        {delta !== undefined && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 12.5, fontWeight: 600, color: dc }}>
            <DIcon size={13} strokeWidth={2.4} />{up ? "+" : ""}{delta}
          </span>
        )}
      </div>
      {hint && <div style={{ fontSize: 12, color: color.gray400, marginTop: 6 }}>{hint}</div>}
    </Card>
  );
}

function Section({ title, action, children }) {
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
        <h2 style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 16, letterSpacing: "-0.01em", margin: 0 }}>{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

// Deriva 2-3 frases úteis a partir dos números (sem inventar dado).
function buildInsights(d, display = DEFAULT_CURRENCY) {
  const out = [];
  const { kpis, templates, clientesQuentes, funil } = d;
  const bestTpl = (templates || []).filter((t) => t.total >= 2).sort((a, b) => b.conversao - a.conversao)[0];
  if (bestTpl && bestTpl.conversao > 0) out.push(`O template ${tplLabel(bestTpl.template)} é o que mais fecha: ${bestTpl.conversao}% de aceitação.`);
  const hot = (clientesQuentes || []).find((c) => c.views >= 2 && c.emNegociacao > 0);
  if (hot) out.push(`${hot.client} abriu sua proposta ${hot.views} vezes e ainda não respondeu — um bom momento pra um follow-up.`);
  if (kpis.taxaAceitacao > 0) out.push(`Sua taxa de aceitação está em ${kpis.taxaAceitacao}%${kpis.taxaAceitacao >= 40 ? " — acima da média do mercado." : "."}`);
  if (kpis.tempoMedioAceite > 0) out.push(`Clientes levam em média ${kpis.tempoMedioAceite} dia${kpis.tempoMedioAceite === 1 ? "" : "s"} pra aceitar depois de receber.`);
  if (kpis.emNegociacao > 0) out.push(`Você tem ${formatMoney(kpis.emNegociacao, display)} em propostas ainda em aberto.`);
  if (funil.enviada + funil.visualizada > 0 && !out.length) out.push(`Você tem ${funil.enviada + funil.visualizada} proposta(s) aguardando resposta.`);
  return out.slice(0, 3);
}

export default function Home({ user, onNewProposal, onNavigate }) {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);
  const [display, setDisplay] = useState(user?.currency || DEFAULT_CURRENCY);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [err, setErr] = useState(false);

  const load = async (d = days, disp = display, first = false) => {
    if (first) setLoading(true); else setChartLoading(true);
    setErr(false);
    try {
      const res = await api.dashboard(d, disp);
      setData(res);
    } catch {
      setErr(true);
    } finally {
      setLoading(false); setChartLoading(false);
    }
  };

  useEffect(() => { load(days, display, true); /* eslint-disable-next-line */ }, []);
  const pickDays = (d) => { if (d === days) return; setDays(d); load(d, display); };
  const pickCurrency = (code) => { if (code === display) return; setDisplay(code); load(days, code); };
  const money = (v) => formatMoney(v, display);

  const insights = useMemo(() => (data ? buildInsights(data, display) : []), [data, display]);
  const totalProps = data ? Object.values(data.funil).reduce((a, b) => a + b, 0) : 0;
  const empty = data && totalProps === 0;

  const actions = [
    { label: "Nova proposta", desc: "Comece do zero", Icon: Plus, on: onNewProposal, accent: true },
    { label: "Calculadora", desc: "Precifique um projeto", Icon: Calculator, on: () => onNavigate("calc") },
    { label: "Templates", desc: "Escolha um modelo", Icon: LayoutGrid, on: () => onNavigate("templates") },
    { label: "Clientes", desc: "Veja sua carteira", Icon: Users, on: () => onNavigate("clients") },
  ];

  return (
    <div className="hm-wrap">
      <style>{`
        .hm-wrap { padding: 26px 24px 40px; max-width: 1200px; }
        .hm-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
        .hm-cols { display: grid; grid-template-columns: 1.7fr 1fr; gap: 16px; align-items: start; }
        .hm-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
        .hm-chip { font-size: 12.5px; font-weight: 600; padding: 6px 11px; border-radius: 999px; border: 1px solid ${color.line2}; background: ${color.white}; color: ${color.gray500}; cursor: pointer; transition: all .15s; }
        .hm-chip:hover { border-color: ${color.gray300}; color: ${color.gray700}; }
        .hm-chip.on { background: ${color.ink}; color: #fff; border-color: ${color.ink}; }
        .hm-act { display: flex; align-items: center; gap: 12px; padding: 13px 14px; border: 1px solid ${color.line2}; border-radius: 12px; background: ${color.white}; cursor: pointer; text-align: left; width: 100%; transition: all .15s; }
        .hm-act:hover { border-color: ${color.gray300}; transform: translateY(-1px); box-shadow: 0 6px 20px -12px rgba(20,20,30,0.18); }
        .hm-link { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600; color: ${color.accentInk}; background: none; border: none; cursor: pointer; padding: 0; }
        .hm-link:hover { color: ${color.accentHover}; }
        .hm-row { display: flex; align-items: center; gap: 12px; padding: 11px 0; border-top: 1px solid ${color.line3}; }
        .hm-row:first-child { border-top: none; }
        .hm-cursel { display: inline-flex; align-items: center; gap: 6px; border: 1px solid ${color.line2}; background: ${color.white}; border-radius: 10px; padding: 0 10px; height: 38px; cursor: pointer; transition: border-color .15s; }
        .hm-cursel:hover { border-color: ${color.gray300}; }
        .hm-cursel select { border: none; outline: none; background: transparent; font-family: ${font.body}; font-size: 13.5px; font-weight: 600; color: ${color.gray700}; cursor: pointer; padding: 8px 2px; }
        .hm-skel { background: ${color.surface}; border-radius: 12px; animation: hmpulse 1.3s ease-in-out infinite; }
        @keyframes hmpulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
        @media (max-width: 980px) { .hm-cols { grid-template-columns: 1fr; } .hm-kpis { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px) { .hm-wrap { padding: 20px 16px 32px; } }
      `}</style>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 27, letterSpacing: "-0.02em", margin: "0 0 4px" }}>
            {greeting()}{user?.name ? `, ${firstName(user.name)}` : ""}.
          </h1>
          <p style={{ fontSize: "14.5px", color: color.gray500, margin: 0, textTransform: "capitalize" }}>{today()}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <label className="hm-cursel" title="Moeda de exibição do painel">
            <span aria-hidden="true">{currencyOf(display).flag}</span>
            <select value={display} onChange={(e) => pickCurrency(e.target.value)} aria-label="Moeda de exibição do painel">
              {CURRENCY_LIST.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.symbol}</option>)}
            </select>
          </label>
          <button onClick={onNewProposal} className="db-btn db-btn-accent" style={{ fontSize: 14, padding: "10px 16px", flex: "none", display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600, borderRadius: 10, border: "none", color: "#fff", background: color.accent, cursor: "pointer" }}>
            <Plus size={16} strokeWidth={2.4} />Nova proposta
          </button>
        </div>
      </div>

      {loading ? (
        <>
          <div className="hm-kpis">{[0, 1, 2, 3].map((i) => <div key={i} className="hm-skel" style={{ height: 92 }} />)}</div>
          <div className="hm-cols">
            <div className="hm-skel" style={{ height: 320 }} />
            <div className="hm-skel" style={{ height: 320 }} />
          </div>
        </>
      ) : err ? (
        <Card style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: color.gray600, margin: "0 0 14px" }}>Não foi possível carregar seu painel.</p>
          <button onClick={() => load(days, display, true)} className="hm-chip" style={{ margin: "0 auto" }}>
            <RefreshCw size={13} strokeWidth={2.2} style={{ verticalAlign: "-2px", marginRight: 5 }} />Tentar de novo
          </button>
        </Card>
      ) : empty ? (
        <Card style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: color.accentTint, color: color.accentInk, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <FileText size={24} strokeWidth={1.8} />
          </div>
          <h2 style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 20, margin: "0 0 8px" }}>Seu painel começa com a primeira proposta</h2>
          <p style={{ fontSize: 14.5, color: color.gray500, maxWidth: 420, margin: "0 auto 20px" }}>
            Assim que você criar e enviar propostas, aqui você acompanha valores em negociação, taxa de aceitação, clientes que mais abrem e muito mais.
          </p>
          <button onClick={onNewProposal} style={{ fontSize: 14.5, fontWeight: 600, padding: "11px 20px", borderRadius: 10, border: "none", color: "#fff", background: color.accent, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Plus size={17} strokeWidth={2.4} />Criar primeira proposta
          </button>
        </Card>
      ) : data && (
        <>
          {/* Moeda de exibição + aviso de cotação */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14, fontSize: 12.5, color: color.gray500 }}>
            <span>Valores em {currencyOf(display).name} ({currencyOf(display).symbol}){display !== "BRL" ? " · convertidos pela cotação atual" : ""}.</span>
            {data.moeda?.desatualizada && (
              <span style={{ color: "#8A5A1A", background: "#FEF3E2", border: "1px solid #F5D9A8", padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>
                Cotação pode estar desatualizada
              </span>
            )}
            {chartLoading && <span className="db-spin" style={{ display: "inline-block", width: 11, height: 11, border: `1.5px solid ${color.line}`, borderTopColor: color.gray400, borderRadius: "50%" }} />}
          </div>

          {/* KPIs */}
          <div className="hm-kpis">
            <Kpi label="Em negociação" value={money(data.kpis.emNegociacao)} hint="Propostas enviadas e abertas" />
            <Kpi label="Propostas no mês" value={data.kpis.criadasMes} delta={data.kpis.criadasMes - data.kpis.criadasMesAnt} hint="vs. mês anterior" />
            <Kpi label="Taxa de aceitação" value={`${data.kpis.taxaAceitacao}%`} hint="Do total já enviado" />
            <Kpi label="Ticket médio" value={money(data.kpis.valorMedio)} hint={`${data.kpis.clientesAtivos} cliente(s) ativo(s) · ${data.kpis.tempoMedioAceite || 0}d p/ aceitar`} />
          </div>

          <div className="hm-cols">
            {/* COLUNA PRINCIPAL */}
            <div className="hm-col">
              <Section
                title="Propostas ao longo do tempo"
                action={
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {chartLoading && <span className="db-spin" style={{ display: "inline-block", width: 12, height: 12, border: `1.5px solid ${color.line}`, borderTopColor: color.gray400, borderRadius: "50%" }} />}
                    {FILTERS.map((f) => (
                      <button key={f.d} onClick={() => pickDays(f.d)} className={`hm-chip${days === f.d ? " on" : ""}`}>{f.l}</button>
                    ))}
                  </div>
                }
              >
                <Chart serie={data.serie} days={days} />
              </Section>

              <Section title="Funil de propostas">
                <Funnel funil={data.funil} />
              </Section>

              <Section title="Atividade recente">
                {data.atividade.length === 0 ? (
                  <p style={{ fontSize: 13.5, color: color.gray500, margin: 0 }}>Nada por aqui ainda. Quando um cliente abrir, aceitar ou receber uma proposta, aparece aqui.</p>
                ) : (
                  <div>
                    {data.atividade.map((a, i) => {
                      const m = ACT[a.type] || ACT.viewed;
                      return (
                        <div key={i} className="hm-row">
                          <span style={{ width: 34, height: 34, flex: "none", borderRadius: 9, background: m.bg, color: m.c, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <m.Icon size={16} strokeWidth={2.2} />
                          </span>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 13.5, color: color.gray700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              <strong style={{ fontWeight: 600, color: color.ink }}>{a.client || "Cliente"}</strong> {m.verb}
                              {a.title ? <span style={{ color: color.gray500 }}> · {a.title}</span> : null}
                            </div>
                          </div>
                          <span style={{ flex: "none", fontSize: 12, color: color.gray400 }}>{ago(a.createdAt)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Section>
            </div>

            {/* COLUNA LATERAL */}
            <div className="hm-col">
              {insights.length > 0 && (
                <Card style={{ background: color.accentTint, border: `1px solid ${color.accentLine}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <Sparkles size={16} strokeWidth={2.2} color={color.accentInk} />
                    <h2 style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 15, margin: 0, color: color.accentInk }}>Insights</h2>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {insights.map((t, i) => (
                      <p key={i} style={{ fontSize: 13.5, lineHeight: 1.5, color: color.gray700, margin: 0 }}>{t}</p>
                    ))}
                  </div>
                </Card>
              )}

              <Section title="Ações rápidas">
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {actions.map((a) => (
                    <button key={a.label} onClick={a.on} className="hm-act">
                      <span style={{ width: 36, height: 36, flex: "none", borderRadius: 10, background: a.accent ? color.accent : color.surface, color: a.accent ? "#fff" : color.gray700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <a.Icon size={17} strokeWidth={2.1} />
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: color.ink }}>{a.label}</span>
                        <span style={{ display: "block", fontSize: 12, color: color.gray500 }}>{a.desc}</span>
                      </span>
                      <ArrowRight size={15} strokeWidth={2.2} color={color.gray400} />
                    </button>
                  ))}
                </div>
              </Section>

              <Section title="Clientes quentes">
                {data.clientesQuentes.length === 0 ? (
                  <p style={{ fontSize: 13.5, color: color.gray500, margin: 0 }}>Ninguém abriu suas propostas ainda.</p>
                ) : (
                  <div>
                    {data.clientesQuentes.map((c, i) => (
                      <div key={i} className="hm-row">
                        <span style={{ width: 30, height: 30, flex: "none", borderRadius: 8, background: color.accentTint, color: color.accentInk, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Flame size={15} strokeWidth={2.2} />
                        </span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: color.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.client}</div>
                          <div style={{ fontSize: 12, color: color.gray500 }}>
                            {c.views > 0 ? `${c.views} abertura${c.views > 1 ? "s" : ""}` : "sem aberturas"}
                            {c.ultimaAbertura ? ` · ${ago(c.ultimaAbertura)}` : ""}
                          </div>
                        </div>
                        {c.emNegociacao > 0 && (
                          <span style={{ flex: "none", fontSize: 12.5, fontWeight: 600, color: color.gray700 }}>{money(c.emNegociacao)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {data.templates.length > 0 && (
                <Section title="Templates que mais fecham" action={<button className="hm-link" onClick={() => onNavigate("templates")}>Ver todos<ArrowRight size={14} strokeWidth={2.2} /></button>}>
                  <div>
                    {data.templates.slice(0, 4).map((t, i) => (
                      <div key={i} className="hm-row">
                        <span style={{ width: 26, flex: "none", fontFamily: font.heading, fontWeight: 700, fontSize: 14, color: color.gray400, textAlign: "center" }}>{i + 1}</span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: color.ink }}>{tplLabel(t.template)}</div>
                          <div style={{ fontSize: 12, color: color.gray500 }}>{t.total} proposta{t.total > 1 ? "s" : ""} · {t.aceitas} aceita{t.aceitas !== 1 ? "s" : ""}</div>
                        </div>
                        <span style={{ flex: "none", fontSize: 13, fontWeight: 700, color: t.conversao >= 40 ? statusColors.Aceita.c : color.gray600 }}>{t.conversao}%</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
