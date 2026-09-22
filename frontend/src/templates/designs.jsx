import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { font, color } from "../theme.js";
import { formatMoney } from "../lib/currency.js";
import { qtyOf, lineTotal, sumItems } from "../lib/items.js";

/* ════════════════════════════════════════════════════════════════════════════
   FUNDAÇÃO DO SISTEMA DE DOCUMENTOS
   ----------------------------------------------------------------------------
   Antes: cada template era um <div> com borda, raio e sombra — ou seja, um CARD.
   Doze cards com cores diferentes parecem doze variações do mesmo arquivo.
   Agora: todo template é uma FOLHA (Sheet) com proporção e margens de papel A4,
   e o que muda entre modelos é a composição dentro da folha, não a casca.

   Separação obrigatória (pedido do produto):
     CONTEÚDO     -> `doc` (mesmo objeto do banco, intocado) normalizado por `model()`
     APRESENTAÇÃO -> cada template decide posição, hierarquia, tipografia e grid

   Trocar de template NUNCA perde dado: nenhum template lê campo que os outros
   não leiam; todos consomem o mesmo `model(doc)`.
   ══════════════════════════════════════════════════════════════════════════ */

// A4 a 96dpi. É a largura de referência de TODO desenho aqui: o que é escrito
// como 14px é 14px nesta largura, e é exatamente o que vai para o PDF.
export const PAGE_W = 794;
export const PAGE_H = 1123;

const SheetCtx = createContext({ w: PAGE_W, compact: false, print: false, k: 1 });
export const useSheet = () => useContext(SheetCtx);

/* ── Folha ───────────────────────────────────────────────────────────────────
   Mede a própria largura e informa aos filhos se está apertada (`compact`),
   para o template reorganizar colunas em vez de encolher a tipografia. Em modo
   `print` some a sombra e o arredondamento — papel não tem sombra dentro do PDF. */

/* ── Folha no celular ────────────────────────────────────────────────────────
   O documento é desenhado numa folha de 794px. Num telefone em pé sobram ~390px
   — e uma grade de "150px de rótulo + 1fr de texto" deixa 90px para o parágrafo,
   que é onde a palavra "Criação" quebra em "Criaçã / o". O usuário virava o
   aparelho de lado para conseguir ler.

   Estas regras reorganizam a folha abaixo de 720px. São MEDIA queries, não
   container queries, de propósito: a miniatura da galeria e o nó oculto do PDF
   renderizam a 794px dentro de uma janela larga, então continuam com o layout
   completo. Só o telefone de verdade reflui.

   As classes são aplicadas automaticamente na montagem do arquivo (build), a
   partir do próprio estilo de cada elemento — não dependem de alguém lembrar de
   marcar cada div. */
const PD_MOBILE_CSS = `
@media (max-width: 720px) {
  [data-sheet] .pd-pad { padding-left: 22px !important; padding-right: 22px !important; }
  [data-sheet] .pd-g { display: block !important; }
  [data-sheet] .pd-g > * { display: block !important; }
  [data-sheet] .pd-g > * + * { margin-top: 12px !important; }
  [data-sheet] .pd-g2 { grid-template-columns: 1fr 1fr !important; }
  [data-sheet] .pd-t { grid-template-columns: 26px minmax(0,1fr) auto !important; column-gap: 9px !important; }
  [data-sheet] .pd-w100 { width: 100% !important; min-width: 0 !important; max-width: 100% !important; }
  [data-sheet] .pd-d1 { font-size: 52px !important; letter-spacing: -0.04em !important; }
  [data-sheet] .pd-d2 { font-size: 31px !important; }
  [data-sheet] .pd-d3 { font-size: 22px !important; }
  [data-sheet] .pd-wrap { flex-wrap: wrap !important; gap: 14px 20px !important; }
  [data-sheet] .pd-cover { min-height: 430px !important; padding-top: 30px !important; padding-bottom: 30px !important; }
  [data-sheet] .pd-hide { display: none !important; }
}
@media (max-width: 420px) {
  [data-sheet] .pd-pad { padding-left: 16px !important; padding-right: 16px !important; }
  [data-sheet] .pd-g2 { grid-template-columns: 1fr !important; }
  [data-sheet] .pd-d1 { font-size: 40px !important; }
  [data-sheet] .pd-d2 { font-size: 26px !important; }
}
`;

// Injeta uma vez por página, no <head>, em vez de repetir uma <style> por folha.
let pdCssDone = false;
function usePdMobileCss() {
  useLayoutEffect(() => {
    if (pdCssDone || typeof document === "undefined") return;
    if (document.getElementById("pd-mobile-css")) { pdCssDone = true; return; }
    const el = document.createElement("style");
    el.id = "pd-mobile-css";
    el.textContent = PD_MOBILE_CSS;
    document.head.appendChild(el);
    pdCssDone = true;
  }, []);
}

export function Sheet({ children, bg = "#FFFFFF", ink = "#18181B", print = false, style }) {
  usePdMobileCss();
  const ref = useRef(null);
  const [w, setW] = useState(PAGE_W);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const cw = Math.round(entries[0].contentRect.width);
      if (cw > 0) setW(cw);
    });
    ro.observe(el);
    const start = Math.round(el.getBoundingClientRect().width);
    if (start > 0) setW(start);
    return () => ro.disconnect();
  }, []);
  const ctx = { w, compact: w < 640, print, k: Math.min(1, w / PAGE_W) };
  return (
    <SheetCtx.Provider value={ctx}>
      <div
        ref={ref}
        data-sheet="1"
        style={{
          background: bg,
          color: ink,
          borderRadius: print ? 0 : 4,
          boxShadow: print ? "none" : "0 1px 2px rgba(24,24,27,.06), 0 18px 46px -22px rgba(24,24,27,.30)",
          overflow: "hidden",
          overflowWrap: "anywhere",
          wordBreak: "break-word",
          fontFamily: font.body,
          ...style,
        }}
      >
        {children}
      </div>
    </SheetCtx.Provider>
  );
}

/* ── Quebra de página ────────────────────────────────────────────────────────
   Marcador de altura zero que o exportador de PDF lê para saber ONDE pode
   cortar. "hard" = começa página nova aqui (usado depois de capas). "soft" =
   corte preferencial (o exportador escolhe o último soft que ainda cabe).
   Sem isto, o PDF corta a cada 297mm no escuro e parte o total ao meio. */
export function Break({ hard = false }) {
  return <div data-pdf-break={hard ? "hard" : "soft"} aria-hidden="true" style={{ height: 0, lineHeight: 0, fontSize: 0 }} />;
}

/* ── Miniatura fiel ──────────────────────────────────────────────────────────
   O problema da galeria não era o desenho dos templates: `.db-dsn-thumb` tem
   altura fixa de 300px com overflow hidden, então todo card mostrava apenas o
   CABEÇALHO de cada documento — a parte que mais se parece entre modelos.
   Aqui a folha é renderizada na largura real (794px) e reduzida por transform,
   virando uma miniatura proporcional de PÁGINA INTEIRA. */
export function PageThumb({ children, width, maxPages = 1 }) {
  const box = useRef(null);
  const inner = useRef(null);
  const [w, setW] = useState(width || 300);
  useLayoutEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const ros = [];
    if (!width && box.current) {
      const ro = new ResizeObserver((e) => { const cw = Math.round(e[0].contentRect.width); if (cw > 0) setW(cw); });
      ro.observe(box.current); ros.push(ro);
      const s = Math.round(box.current.getBoundingClientRect().width);
      if (s > 0) setW(s);
    }
    return () => ros.forEach((r) => r.disconnect());
  }, [width]);
  const k = w / PAGE_W;
  // Altura FIXA de página: todo card fica do mesmo tamanho na grade. Deixar a
  // miniatura acompanhar a altura real do documento dava cards desalinhados e
  // buracos entre as linhas da grade. Documento curto mostra o resto da folha
  // em branco — que é o que ele é de verdade; documento longo é cortado
  // exatamente no fim da página 1.
  const shown = PAGE_H * maxPages;
  return (
    <div ref={box} style={{ width: width || "100%", height: Math.round(shown * k), overflow: "hidden", position: "relative" }}>
      <div ref={inner} style={{ width: PAGE_W, transform: `scale(${k})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }}>
        {children}
      </div>
    </div>
  );
}

/* ════════════ CONTEÚDO — normalização única, usada por todos os 12 ═════════ */

export const has = (v) => v != null && String(v).trim() !== "";
const filledItems = (doc) => (doc.items || []).filter((it) => !it.hidden && (has(it.desc) || has(it.value)));

export const money = (v, cur = "BRL") => (has(v) ? formatMoney(parseInt(v, 10) || 0, cur) : "");

/* ── Quantidade (opcional, por proposta) ─────────────────────────────────────
   A coluna Quantidade é desligada por padrão. Enquanto estiver desligada, TODO
   modelo desenha exatamente o que desenhava antes: o item é `desc` e o valor é
   `value`. Ligada, o valor digitado passa a ser o preço POR UNIDADE e o que
   aparece na linha é o total dela (quantidade × unitário).

   O model() já entrega cada item com `qty` (número, 1 quando não informada) e
   `line` (o total da linha), então nenhum modelo precisa fazer conta. As três
   funções abaixo são só apresentação, e todas devolvem o comportamento antigo
   com a coluna desligada — é o que mantém os 12 modelos intactos para quem não
   usa isto.

   A conta em si mora em lib/items.js, que é a mesma regra que o servidor usa
   para gravar proposals.value. */

// Prefixo do nome do item nos modelos que NÃO são tabela (Carta, Estúdio,
// Pôster...). Nos que são tabela a quantidade vira coluna de verdade.
export const qtyPrefix = (m, it) => (m.showQty ? `${it.qty}× ` : "");

// Linha auxiliar "R$ 240 × 2", para o cliente conferir de onde saiu o total da
// linha sem precisar de uma quarta coluna. Só aparece quando há o que conferir:
// com quantidade 1 o unitário é o próprio total.
export const unitNote = (m, it) => (m.showQty && it.qty > 1 && has(it.value) ? `${money(it.value, m.currency)} × ${it.qty}` : "");

// Valor exibido na linha: SEMPRE o total dela. Com a coluna desligada `line` é
// igual a `value`, então o resultado é idêntico ao de antes, inclusive o "" que
// os modelos trocam por "—" quando o valor está em branco.
export const lineMoney = (m, it) => (has(it.value) ? fmt(it.line, m.currency) : "");
export const fmt = (n, cur = "BRL") => formatMoney(n, cur);

// Data por extenso, curta: "22 de setembro de 2026". Entrada inválida ou
// ausente (rascunho ainda não salvo) cai para hoje, nunca para "Invalid Date".
const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
export function dataBR(v) {
  const d = v ? new Date(v) : new Date();
  const ok = d instanceof Date && !Number.isNaN(d.getTime()) ? d : new Date();
  return `${ok.getDate()} de ${MESES[ok.getMonth()]} de ${ok.getFullYear()}`;
}

// Total em duas partes (símbolo e número) para os modelos que dão à cifra
// tratamento tipográfico próprio — Luxo, Impacto, Editorial.
export function splitMoney(n, cur = "BRL") {
  const s = formatMoney(n, cur);
  const i = s.indexOf(" ");
  return i < 0 ? { sym: "", num: s } : { sym: s.slice(0, i), num: s.slice(i + 1) };
}

/* O modelo de conteúdo. Todo template recebe ISTO, nunca `doc` cru.
   Acrescentar um campo novo no futuro = acrescentar uma linha aqui. */
export function model(doc) {
  const d = doc || {};
  const showQty = !!d.showQty;
  // Cada item sai daqui já com a quantidade resolvida (1 quando não informada,
  // que é o caso de toda proposta anterior a esta feature) e com o total da
  // linha calculado. Assim nenhum dos 12 modelos faz conta.
  const items = filledItems(d).map((it) => ({
    ...it,
    qty: showQty ? qtyOf(it) : 1,
    line: lineTotal(it, showQty),
  }));
  const total = sumItems(items, showQty);
  return {
    showQty,
    // marca / remetente
    // ATENÇÃO: `company` no formulário é a EMPRESA DO CLIENTE (fica na mesma
    // linha do campo "Cliente" e é preenchida junto com ele). Não é o nome de
    // quem envia. O remetente aparece pelo logo (doc.logo) — o app ainda não
    // tem campo para o nome de quem manda.
    clientCo: has(d.company) ? d.company : "",
    logo: d.logo || null,
    bio: has(d.bio) ? d.bio : "",
    // destinatário
    client: has(d.client) ? d.client : "",
    // documento
    title: has(d.title) ? d.title : "",
    scope: has(d.scope) ? d.scope : "",
    cover: d.cover || null,
    coverPos: coverPosition(d.coverPos),
    watermark: has(d.watermark) ? d.watermark : "",
    // investimento
    items, total, currency: d.currency || "BRL",
    // data de emissão — já existe no banco (proposals.created_at). Cai para
    // "hoje" só enquanto a proposta é um rascunho que ainda não foi salvo.
    date: dataBR(d.createdAt),
    // cronograma
    start: has(d.start) ? d.start : "",
    end: has(d.end) ? d.end : "",
    // condições
    payment: has(d.payment) ? d.payment : "",
    revisions: has(d.revisions) ? d.revisions : "",
    validity: has(d.validity) ? d.validity : "",
    raw: d,
  };
}

// Pares [rótulo, valor] já filtrados — evita que cada template repita `has()`.
export const pairs = (...list) => list.filter(([, v]) => has(v));

/* ══════════════════ ENQUADRAMENTO DA CAPA (comportamento existente) ════════ */
export function coverPosition(s) {
  const m = /^(\d{1,3}),(\d{1,3})$/.exec(String(s || ""));
  if (!m) return "center";
  return `${Math.min(100, +m[1])}% ${Math.min(100, +m[2])}%`;
}

/* ══════════════════ COR — contraste garantido ═════════════════════════════ */
const lum = (hex) => {
  const h = String(hex || "").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (full.length !== 6) return 0;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return 0;
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
};
export const onDark = (a) => (lum(a) < 0.4 ? "#FFFFFF" : a);
export const onLight = (a) => (lum(a) > 0.68 ? "#18181B" : a);
export const btnText = (a) => (lum(a) > 0.68 ? "#18181B" : "#FFFFFF");

const rgbOf = (hex) => {
  const h = String(hex || "").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (full.length !== 6) return null;
  const n = parseInt(full, 16);
  return Number.isNaN(n) ? null : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (r, g, b) => "#" + [r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join("");
export const darken = (hex, f = 0.42) => { const c = rgbOf(hex); return c ? toHex(c[0] * (1 - f), c[1] * (1 - f), c[2] * (1 - f)) : hex; };
export const wash = (hex, f = 0.9) => { const c = rgbOf(hex); return c ? toHex(c[0] + (255 - c[0]) * f, c[1] + (255 - c[1]) * f, c[2] + (255 - c[2]) * f) : hex; };
// Mistura com a tinta do tema — usado quando a folha é escura.
export const mix = (a, b, f) => {
  const A = rgbOf(a), B = rgbOf(b);
  return A && B ? toHex(A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, A[2] + (B[2] - A[2]) * f) : a;
};

/* ══════════════════ TEMAS DE FOLHA ════════════════════════════════════════ */
export const THEMES = {
  claro:  { dark: false, bg: "#FFFFFF", border: "#E7E7EA", ink: "#18181B", sub: "#52525B", soft: "#8A8A90", line: "#EBEBEE", panel: "#F7F7F8" },
  creme:  { dark: false, bg: "#FBF8F2", border: "#E8E1D4", ink: "#241C12", sub: "#4E4433", soft: "#8C7B62", line: "#EDE6D8", panel: "#F4EFE4" },
  escuro: { dark: true,  bg: "#141416", border: "#2A2A2E", ink: "#F4F4F6", sub: "#C4C4CB", soft: "#8E8E96", line: "#28282C", panel: "#1D1D20" },
};

/* O template declara os temas que a identidade dele aguenta. Um "Luxo" com
   fundo creme e destaque rosa neon não é mais um Luxo — por isso a folha de
   cada modelo restringe as opções em vez de aceitar as 36 combinações. */
export function themeOf(doc, allowed) {
  const want = (doc && doc.theme) || "claro";
  const list = allowed && allowed.length ? allowed : ["claro", "creme", "escuro"];
  return THEMES[list.includes(want) ? want : list[0]] || THEMES.claro;
}

export const accentInkFor = (accent, T) => (T.dark ? onDark(accent) : darken(accent, 0.34));
export const panelFor = (accent, T) => (T.dark ? darken(accent, 0.72) : wash(accent, 0.9));
export const hairFor = (accent, T) => (T.dark ? darken(accent, 0.5) : wash(accent, 0.6));

/* Política de cor por template. O usuário escolhe qualquer destaque; o modelo
   decide QUANTO daquilo aparece. É o que impede um template sóbrio de virar
   outro template vibrante só porque a cor mudou. */
export function accentUse(policy, accent, T) {
  if (policy === "hairline") {
    // A cor existe como fio e detalhe. Títulos e superfícies ficam em tinta.
    return { line: accent, head: T.ink, fill: T.ink, fillInk: T.bg, chip: T.panel, chipInk: T.sub, cta: T.ink, ctaInk: T.bg };
  }
  if (policy === "full") {
    const a = accent;
    return { line: a, head: accentInkFor(a, T), fill: a, fillInk: btnText(a), chip: panelFor(a, T), chipInk: accentInkFor(a, T), cta: a, ctaInk: btnText(a) };
  }
  // "restrained" (padrão): a cor guia títulos e realces, não pinta o documento.
  const deep = accentInkFor(accent, T);
  return { line: accent, head: deep, fill: deep, fillInk: btnText(deep), chip: panelFor(accent, T), chipInk: deep, cta: accent, ctaInk: btnText(accent) };
}

/* ══════════════════ TIPOGRAFIA ════════════════════════════════════════════ */
// Serifa de documento. Carregada junto das outras no index.html; a cadeia de
// fallback é de serifas reais (nunca cai em sans) caso o Fontshare não responda.
export const serif = "'Zodiak', 'Iowan Old Style', 'Palatino Linotype', Palatino, 'Times New Roman', serif";
export const mono = "ui-monospace, 'SFMono-Regular', 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";
export { font, color };

/* ══════════════════ EDIÇÃO EM LINHA (comportamento existente) ═════════════ */
export function rich(text) {
  if (typeof text !== "string" || text === "") return text;
  const out = [];
  const lines = text.split("\n");
  lines.forEach((raw, li) => {
    const line = raw.replace(/^(\s*)[*-]\s+/, "$1• ");
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*|_[^_\n]+_)/g);
    parts.forEach((p, pi) => {
      if (!p) return;
      const key = `${li}-${pi}`;
      if (/^\*\*[^*]+\*\*$/.test(p)) out.push(<strong key={key}>{p.slice(2, -2)}</strong>);
      else if (/^\*[^*\n]+\*$/.test(p) || /^_[^_\n]+_$/.test(p)) out.push(<em key={key}>{p.slice(1, -1)}</em>);
      else out.push(p);
    });
    if (li < lines.length - 1) out.push(<br key={`br-${li}`} />);
  });
  return out;
}

export function Ed({ onEdit, field, children }) {
  const content = typeof children === "string" ? rich(children) : children;
  if (!onEdit) return content;
  return (
    <span className="pd-edit" role="button" tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onEdit(field); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onEdit(field); } }}>
      {content}
    </span>
  );
}

/* ══════════════════ MARCA ═════════════════════════════════════════════════ */
export function Mark({ size, fill = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="24 287 506 506" fill={fill} style={{ display: "block", flex: "none" }} aria-hidden="true">
      <path fillRule="evenodd" d="M57.62,472.454v285.2h147.1V613.55Z" />
      <path fillRule="evenodd" d="M351.82,613.55v144.1h144.1v-142.6Z" />
      <path fillRule="evenodd" d="M56.12,472.454l148.6,142.6h141.09l-142.59-144.1Z" />
      <path fillRule="evenodd" d="M275.27,546l222.15-223.653v148.6l-144.1,144.1h-9.01Z" />
    </svg>
  );
}

// Logo em caixa (padrão dos modelos com bloco de marca).
export function Mono({ doc, size = 42, radius = 10, bg = color.ink, fg = "#fff" }) {
  if (doc.logo) return <img src={doc.logo} alt="" style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", display: "block", flex: "none" }} />;
  return <span style={{ width: size, height: size, borderRadius: radius, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Mark size={size * 0.58} fill={fg} /></span>;
}

// Logo SEM caixa — usado pelos modelos editoriais/clássicos, onde um quadrado
// colorido no topo destruiria a sobriedade da folha.
export function Wordmark({ doc, h = 26, ink = "#18181B" }) {
  if (doc.logo) return <img src={doc.logo} alt="" style={{ height: h, maxWidth: h * 5, objectFit: "contain", display: "block" }} />;
  return <Mark size={h} fill={ink} />;
}

/* ── Compatibilidade com os modelos herdados ────────────────────────────────
   Os oito modelos abaixo ainda usam estes utilitários do arquivo antigo. Eles
   serão reescritos na onda 2; até lá continuam funcionando sem alteração de
   comportamento. */
const kicker = (c) => ({ fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: c, marginBottom: 8 });
const accentFill = (doc, accent) => (doc.gradient && has(doc.accent2))
  ? `linear-gradient(135deg, ${accent} 0%, ${doc.accent2} 100%)`
  : accent;



/* ═══════════════════════════════════════════════════════════════════════════
   1) TÉCNICO   (id: recibo)
   ---------------------------------------------------------------------------
   Substitui o antigo "Recibo" — que era literalmente um cupom fiscal: fonte
   Courier, linhas tracejadas, carimbo girado e "* OBRIGADO PELA PREFERÊNCIA *".
   Recibo é documento de dinheiro JÁ PAGO; como proposta, o conceito não tinha
   como funcionar.

   Conceito novo: ficha técnica. A monoespaçada continua, mas no papel dela —
   rótulos, índices e números — e não no texto corrido. Estrutura só de fios:
   nenhum preenchimento, nenhum raio de canto, nenhuma sombra. Apresentação de
   preço: TABELA MODULAR com índice por linha.
   Público: dev, produto, TI, engenharia.
   ═══════════════════════════════════════════════════════════════════════════ */

const TEC_THEMES = ["claro", "escuro"];

function TecRule({ label, c, line, top = 34 }) {
  return (<>
    <Break />
    <div style={{ display: "flex", alignItems: "center", gap: 14, margin: `${top}px 0 18px` }}>
      <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: c, flex: "none" }}>{label}</span>
      <span style={{ flex: 1, height: 1, background: line }} />
    </div>
  </>);
}

function Tecnico({ doc, accent, onAccept, onEdit, print, pdf }) {
  const m = model(doc);
  const T = themeOf(doc, TEC_THEMES);
  const A = accentUse("restrained", accent, T);
  const meta = pairs(["Cliente", m.client], ["Início", m.start], ["Entrega", m.end], ["Validade", m.validity]);
  const conds = pairs(["Pagamento", m.payment], ["Revisões", m.revisions]);
  const lbl = { fontFamily: mono, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: T.soft };
  const num = { fontFamily: mono, fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum"' };

  return (
    <Sheet bg={T.bg} ink={T.ink} print={print}>
      <div className="pd-pad" style={{ padding: "54px 60px 46px" }}>

        {/* cabeçalho: marca à esquerda, identificação do documento à direita */}
        <div className="pd-g" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, paddingBottom: 20, borderBottom: `1px solid ${T.ink}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <Wordmark doc={doc} h={22} ink={T.ink} />
          </div>
          <div style={{ textAlign: "right", flex: "none" }}>
            <div style={{ ...lbl, color: A.head }}>Proposta técnica</div>
            {has(m.validity) && <div style={{ ...num, fontSize: 11, color: T.soft, marginTop: 4 }}>VÁLIDA POR {String(m.validity).toUpperCase()}</div>}
          </div>
        </div>

        {/* faixa de metadados — células divididas por fio vertical */}
        {meta.length > 0 && (
          <div className="pd-g2" style={{ display: "grid", gridTemplateColumns: `repeat(${meta.length}, 1fr)`, borderBottom: `1px solid ${T.line}` }}>
            {meta.map(([k, v], i) => (
              <div key={k} style={{ padding: "16px 18px 16px 0", borderLeft: i ? `1px solid ${T.line}` : "none", paddingLeft: i ? 18 : 0 }}>
                <div style={lbl}>{k}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginTop: 5, lineHeight: 1.35 }}>
                  {k === "Cliente" ? <Ed onEdit={onEdit} field="client">{v}</Ed> : v}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* título — sóbrio de propósito: documentação técnica não grita */}
        <h2 className="pd-d3" style={{ fontFamily: font.heading, fontWeight: 600, fontSize: 30, lineHeight: 1.18, letterSpacing: "-0.022em", margin: "32px 0 0", color: m.title ? T.ink : T.soft, maxWidth: "88%" }}>
          <Ed onEdit={onEdit} field="title">{m.title || "Título da proposta"}</Ed>
        </h2>

        {has(m.scope) && (<>
          <TecRule label="Escopo" c={A.head} line={T.line} top={30} />
          <p style={{ fontSize: 14, lineHeight: 1.75, color: T.sub, margin: 0, maxWidth: 560 }}>
            <Ed onEdit={onEdit} field="scope">{m.scope}</Ed>
          </p>
        </>)}

        {m.items.length > 0 && (<>
          <Break />
          <TecRule label="Investimento" c={A.head} line={T.line} />

          {/* TABELA MODULAR: índice, descrição, valor. Só fios horizontais. */}
          <div className="pd-t" style={{ display: "grid", gridTemplateColumns: "34px 1fr 150px", columnGap: 10, padding: "0 0 9px" }}>
            <span style={lbl}>{m.showQty ? "Qtd" : "#"}</span>
            <span style={lbl}>Descrição</span>
            <span style={{ ...lbl, textAlign: "right" }}>Valor</span>
          </div>
          {m.items.map((it, i) => (
            <React.Fragment key={i}>
            {i > 0 && <Break />}
            <div className="pd-t" style={{ display: "grid", gridTemplateColumns: "34px 1fr 150px", columnGap: 10, alignItems: "baseline", padding: "13px 0", borderTop: `1px solid ${T.line}` }}>
              <span style={{ ...num, fontSize: 11.5, fontWeight: 600, color: A.head }}>{m.showQty ? it.qty : String(i + 1).padStart(2, "0")}</span>
              <span style={{ fontSize: 13.5, lineHeight: 1.5, color: T.ink }}>
                <Ed onEdit={onEdit} field="items">{it.desc || "Item"}</Ed>
                {!!unitNote(m, it) && <span style={{ ...num, display: "block", fontSize: 10.5, color: T.soft, marginTop: 2 }}>{unitNote(m, it)}</span>}
              </span>
              <span style={{ ...num, fontSize: 13.5, fontWeight: 600, color: has(it.value) ? T.ink : T.soft, textAlign: "right" }}>{lineMoney(m, it) || "—"}</span>
            </div>
            </React.Fragment>
          ))}
          <div className="pd-t" style={{ display: "grid", gridTemplateColumns: "34px 1fr 150px", columnGap: 10, alignItems: "baseline", padding: "16px 0 0", borderTop: `1.5px solid ${A.line}`, marginTop: 2 }}>
            <span />
            <span style={{ ...lbl, color: A.head, alignSelf: "center" }}>Total</span>
            <span style={{ ...num, fontFamily: font.heading, fontSize: 25, fontWeight: 700, letterSpacing: "-0.02em", color: T.ink, textAlign: "right" }}>{fmt(m.total, m.currency)}</span>
          </div>
        </>)}

        {conds.length > 0 && (<>
          <Break />
          <TecRule label="Condições" c={A.head} line={T.line} top={44} />
          <div className="pd-g" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 28, rowGap: 14 }}>
            {conds.map(([k, v]) => (
              <div key={k}>
                <div style={lbl}>{k}</div>
                <div style={{ fontSize: 13.5, color: T.sub, marginTop: 5, lineHeight: 1.5 }}>{v}</div>
              </div>
            ))}
          </div>
        </>)}

        {has(m.bio) && (<>
          <TecRule label="Responsável" c={A.head} line={T.line} top={34} />
          <p style={{ fontSize: 13, lineHeight: 1.7, color: T.sub, margin: 0, maxWidth: 520 }}><Ed onEdit={onEdit} field="bio">{m.bio}</Ed></p>
        </>)}

        {/* Aprovação — num documento técnico o aceite é um passo, não um banner.
            Por isso o botão é contornado em tinta: a cor de destaque fica nos
            índices e no fio do total, que é onde ela informa alguma coisa. */}
        <TecRule label="Aprovação" c={A.head} line={T.line} top={34} />
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          {!pdf && (
          <button className="pd-pad" onClick={onAccept} style={{ flex: "none", fontFamily: mono, fontSize: 11.5, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: T.ink, background: "transparent", border: `1.5px solid ${T.ink}`, borderRadius: 3, padding: "15px 30px", cursor: "pointer" }}>
            Aceitar proposta
          </button>
          )}
          <span className="pd-w100" style={{ fontSize: 12.5, color: T.soft, lineHeight: 1.55, flex: 1, minWidth: 220 }}>
            O aceite registra a data e vincula as condições descritas acima.
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginTop: 34, paddingTop: 14, borderTop: `1px solid ${T.line}`, ...lbl }}>
          <span>Proposta técnica</span>
          <span>{m.client ? `Para ${m.client}${m.clientCo ? ` · ${m.clientCo}` : ""}` : ""}</span>
        </div>
      </div>
    </Sheet>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   2) CARTA   (id: carta)
   ---------------------------------------------------------------------------
   O antigo era exatamente o que o produto pediu para evitar: coluna central,
   tudo alinhado ao meio, faixa tingida no topo e Georgia.

   Conceito novo: carta comercial de escritório. Papel timbrado, margens largas
   (84px), medida de leitura curta (~62 caracteres), serifa de verdade (Zodiak),
   destinatário e referência como numa carta real, e — o que faltava — BLOCO DE
   ASSINATURA. Apresentação de preço: COMPOSIÇÃO TIPOGRÁFICA com linha de
   condução pontilhada, nunca tabela.
   Público: advogado, contador, consultor, profissional liberal.
   ═══════════════════════════════════════════════════════════════════════════ */

const CARTA_THEMES = ["claro", "creme"];

/* ═══════════════════════════════════════════════════════════════════════════
   CARTA  (id: carta)  —  reescrita como APRESENTAÇÃO COMERCIAL
   ---------------------------------------------------------------------------
   Era uma carta timbrada: serifada, medida curta, "Ao cuidado de", prosa. Boa
   para advogado e consultor, fraca para quem vende pacote de conteúdo — que é
   quem usa este app.

   Vira um documento de agência, na direção do PDF de referência: barra preta no
   topo, manchete de duas linhas em caixa alta, caixa-resumo com O QUE e QUANTO,
   tabela de serviços com cabeçalho sombreado, investimento em faixas cinza,
   caixa de encerramento e rodapé corrido em toda página.

   O que foi PRESERVADO da carta antiga, de propósito: o bloco de assinatura.
   É o único dos 12 que tem um, e é o que faz o documento valer como aceite no
   papel. Ele passa a morar no encerramento.

   A tipografia é a do app (General Sans / Satoshi), não a Arial da referência:
   uma fonte estranha só neste modelo pareceria erro de carregamento ao lado dos
   outros onze, e o rasterizador do PDF já é sensível a fonte que não carrega.
   ═══════════════════════════════════════════════════════════════════════════ */

// Datas viram texto corrido porque data sempre encaixa numa frase. Já pagamento
// e revisões o usuário escreve livre ("PIX", "3x", "mensal, até o dia 10") —
// costurar isso em prosa produz português quebrado.
function frasePrazos(m) {
  if (!has(m.start) && !has(m.end)) return "";
  if (has(m.start) && has(m.end)) return `Os trabalhos têm início em ${m.start}, com entrega prevista para ${m.end}.`;
  if (has(m.start)) return `Os trabalhos têm início em ${m.start}.`;
  return `A entrega está prevista para ${m.end}.`;
}

/* Título de seção. O <Break/> vem ANTES do título, nunca depois: é o que impede
   o exportador de cortar a página entre o título e o conteúdo dele — o "título
   órfão no fim da página". */
function AgSec({ label, ink, line, top = 40 }) {
  return (<>
    <Break />
    <div style={{ margin: `${top}px 0 16px` }}>
      <div style={{ fontFamily: font.heading, fontSize: 17, fontWeight: 700, letterSpacing: "-0.015em", color: ink }}>{label}</div>
      <div style={{ height: 2, width: 34, background: ink, marginTop: 8 }} />
    </div>
  </>);
}

function Carta({ doc, accent, onAccept, onEdit, print, pdf }) {
  const m = model(doc);
  const T = themeOf(doc, CARTA_THEMES);
  const A = accentUse("hairline", accent, T);
  const prazos = frasePrazos(m);
  const conds = pairs(["Forma de pagamento", m.payment], ["Revisões inclusas", m.revisions], ["Validade da proposta", m.validity]);

  // Faixa cinza das linhas alternadas e do cabeçalho da tabela. Sai do tema, e
  // não de um cinza fixo, senão o modelo quebra no papel creme.
  const faixa = T.panel;                     // faixa clara já definida pelo tema
  const faixaForte = mix(T.bg, T.ink, 0.085); // cabeçalho da tabela, um tom acima
  const lbl = { fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: T.soft };
  const num = { fontVariantNumeric: "tabular-nums" };

  // Cabeçalho da tabela: com quantidade são três colunas, sem ela são duas.
  // A grade é declarada num lugar só para cabeçalho e linhas nunca saírem de
  // alinhamento quando a coluna é ligada ou desligada.
  const grade = m.showQty ? "58px minmax(0,1fr) 132px" : "minmax(0,1fr) 132px";
  const rodape = [m.title || "Proposta comercial", m.total > 0 ? fmt(m.total, m.currency) : ""].filter(Boolean);

  return (
    <Sheet bg={T.bg} ink={T.ink} print={print}>
      {/* barra do topo — o elemento que dá a cara de documento de agência */}
      <div style={{ height: 14, background: T.ink }} />
      <div className="pd-pad" style={{ padding: "52px 64px 44px" }}>

        {/* ── 1. CAPA ────────────────────────────────────────────────────── */}
        <div className="pd-g" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 34 }}>
          <Wordmark doc={doc} h={24} ink={T.ink} />
          <span style={{ ...lbl, flex: "none", textAlign: "right" }}>Proposta comercial</span>
        </div>

        <h2 className="pd-d3" style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 40, lineHeight: 1.06, letterSpacing: "-0.035em", textTransform: "uppercase", margin: 0, color: m.title ? T.ink : T.soft, maxWidth: 620 }}>
          <Ed onEdit={onEdit} field="title">{m.title || "Título da proposta"}</Ed>
        </h2>

        {has(m.scope) && (
          <p style={{ fontSize: 14.5, lineHeight: 1.6, color: T.sub, margin: "14px 0 0", maxWidth: 560 }}>
            <Ed onEdit={onEdit} field="scope">{m.scope}</Ed>
          </p>
        )}

        {/* caixa-resumo: PARA QUEM e QUANTO, lado a lado, com fio no meio.
            É o bloco "4 VÍDEOS MENSAIS | R$ 800,00 / MÊS" da referência. */}
        <div className="pd-g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: `1.5px solid ${T.ink}`, marginTop: 30 }}>
          <div style={{ padding: "16px 20px", borderRight: `1.5px solid ${T.ink}`, minWidth: 0 }}>
            <div style={lbl}>Cliente</div>
            <div style={{ fontSize: 15.5, fontWeight: 700, color: T.ink, marginTop: 6, lineHeight: 1.3 }}>
              <Ed onEdit={onEdit} field="client">{m.client || "Cliente"}</Ed>
            </div>
            {!!m.clientCo && <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>{m.clientCo}</div>}
          </div>
          <div style={{ padding: "16px 20px", background: faixa, minWidth: 0 }}>
            <div style={lbl}>{m.total > 0 ? "Investimento" : "Emitida em"}</div>
            <div style={{ ...num, fontFamily: font.heading, fontSize: m.total > 0 ? 22 : 15.5, fontWeight: 800, letterSpacing: "-0.02em", color: T.ink, marginTop: 6, lineHeight: 1.2 }}>
              {m.total > 0 ? fmt(m.total, m.currency) : m.date}
            </div>
            {m.total > 0 && <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{m.date}</div>}
          </div>
        </div>

        {/* ── 2. APRESENTAÇÃO ────────────────────────────────────────────── */}
        {has(m.bio) && (<>
          <AgSec label="Quem apresenta" ink={T.ink} line={T.line} />
          <p style={{ fontSize: 14, lineHeight: 1.72, color: T.sub, margin: 0, maxWidth: 580 }}>
            <Ed onEdit={onEdit} field="bio">{m.bio}</Ed>
          </p>
        </>)}

        {/* ── 3. PROPOSTA DE SERVIÇOS ────────────────────────────────────── */}
        {m.items.length > 0 && (<>
          <AgSec label="O que está incluso" ink={T.ink} line={T.line} />

          <div className={m.showQty ? "pd-t" : undefined} style={{ display: "grid", gridTemplateColumns: grade, columnGap: 14, background: faixaForte, padding: "11px 16px" }}>
            {m.showQty && <span style={lbl}>Qtd</span>}
            <span style={lbl}>Serviço</span>
            <span style={{ ...lbl, textAlign: "right" }}>Valor</span>
          </div>

          {m.items.map((it, i) => (
            <React.Fragment key={i}>
            {/* quebra ENTRE linhas: o corte do PDF nunca cai no meio de uma */}
            <Break />
            <div className={m.showQty ? "pd-t" : undefined} style={{ display: "grid", gridTemplateColumns: grade, columnGap: 14, alignItems: "baseline", padding: "14px 16px", borderBottom: `1px solid ${T.line}`, background: i % 2 ? faixa : "transparent" }}>
              {m.showQty && <span style={{ ...num, fontSize: 14, fontWeight: 700, color: T.ink }}>{it.qty}</span>}
              <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.45, color: T.ink, minWidth: 0 }}>
                <Ed onEdit={onEdit} field="items">{it.desc || "Item"}</Ed>
                {!!unitNote(m, it) && <span style={{ ...num, display: "block", fontSize: 11.5, fontWeight: 500, color: T.soft, marginTop: 3 }}>{unitNote(m, it)}</span>}
              </span>
              <span style={{ ...num, fontSize: 14, fontWeight: 700, color: has(it.value) ? T.ink : T.soft, textAlign: "right" }}>{lineMoney(m, it) || "—"}</span>
            </div>
            </React.Fragment>
          ))}

          {/* ── 4. INVESTIMENTO ──────────────────────────────────────────── */}
          <AgSec label="Investimento" ink={T.ink} line={T.line} top={34} />
          <div>
            {(() => {
              const unidades = m.items.reduce((a, it) => a + it.qty, 0);
              const base = m.showQty ? unidades : m.items.length;
              return pairs(
                ["Serviços contratados", `${m.items.length} ${m.items.length === 1 ? "item" : "itens"}`],
                ...(m.showQty ? [["Unidades", String(unidades)]] : []),
                ...(base > 1 && m.total > 0
                  ? [[m.showQty ? "Valor médio por unidade" : "Valor médio por item", fmt(Math.round(m.total / base), m.currency)]]
                  : []),
              );
            })().map(([k, v], i) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 18, padding: "11px 16px", background: i % 2 ? "transparent" : faixa }}>
                <span style={{ fontSize: 13.5, color: T.sub }}>{k}</span>
                <span style={{ ...num, fontSize: 13.5, fontWeight: 600, color: T.ink, textAlign: "right" }}>{v}</span>
              </div>
            ))}
            {/* o total é a única faixa em tinta cheia: é o número que decide */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, padding: "18px 20px", background: T.ink, marginTop: 4 }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: T.bg, opacity: 0.75 }}>Valor total</span>
              <span className="pd-d3" style={{ ...num, fontFamily: font.heading, fontSize: 30, fontWeight: 900, letterSpacing: "-0.028em", color: T.bg, lineHeight: 1 }}>{fmt(m.total, m.currency)}</span>
            </div>
          </div>
        </>)}

        {/* ── 5. INFORMAÇÕES ADICIONAIS ──────────────────────────────────── */}
        {(conds.length > 0 || prazos) && (<>
          <AgSec label="Condições" ink={T.ink} line={T.line} />
          {!!prazos && <p style={{ fontSize: 14, lineHeight: 1.7, color: T.sub, margin: "0 0 16px", maxWidth: 580 }}>{prazos}</p>}
          {conds.length > 0 && (
            <div className="pd-g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 28px" }}>
              {conds.map(([k, v]) => (
                <div key={k} style={{ borderLeft: `2px solid ${A.line}`, paddingLeft: 13 }}>
                  <div style={lbl}>{k}</div>
                  <div style={{ fontSize: 13.5, color: T.ink, marginTop: 5, lineHeight: 1.5 }}>{v}</div>
                </div>
              ))}
            </div>
          )}
        </>)}

        {/* ── 6. ENCERRAMENTO ────────────────────────────────────────────── */}
        <AgSec label="Aprovação" ink={T.ink} line={T.line} />
        <div style={{ border: `1.5px solid ${T.ink}`, padding: "20px 22px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>Vamos começar?</div>
          <div style={{ fontSize: 13.5, color: T.sub, marginTop: 5, lineHeight: 1.55 }}>
            O aceite registra a data e vincula as condições descritas nesta proposta.
          </div>

          {/* assinatura — herança da carta antiga, o único dos 12 que tem uma */}
          <div className="pd-g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 34, marginTop: 26 }}>
            {[["", "Pela contratada"], [m.client || "Cliente", "De acordo — contratante"]].map(([nome, papel], i) => (
              <div key={i}>
                <div style={{ height: 34 }} />
                <div style={{ borderTop: `1px solid ${T.ink}`, paddingTop: 8 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: T.ink, lineHeight: 1.3 }}>{nome || " "}</div>
                  <div style={{ fontSize: 11, color: T.soft, marginTop: 2 }}>{papel}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {!pdf && (
        <button onClick={onAccept} style={{ marginTop: 20, width: "100%", fontFamily: font.body, fontSize: 12.5, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: T.bg, background: T.ink, border: "none", borderRadius: 0, padding: "18px 14px", cursor: "pointer" }}>
          Aceitar proposta
        </button>
        )}

        {/* rodapé corrido, como o da referência */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginTop: 30, paddingTop: 13, borderTop: `1px solid ${T.line}`, ...lbl }}>
          <span>{rodape[0]}</span>
          <span>{m.client ? `Para ${m.client}` : ""}</span>
        </div>
      </div>
    </Sheet>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   3) CONSULTORIA   (id: grande)
   ---------------------------------------------------------------------------
   O antigo "Grande" era um orçamento com uma letra de 320px ao fundo e chips
   cinzas de dashboard no rodapé — tinha peso visual, não hierarquia.

   Conceito novo: documento de consultoria B2B. Densidade alta, mas organizada:
   ficha do documento emoldurada, SEÇÕES NUMERADAS, tabela de verdade com
   cabeçalho, RESUMO FINANCEIRO separado da tabela, cronograma em etapas e
   bloco de aprovação. A marca d'água (campo que já existe no editor) continua
   funcionando, mas contida no cabeçalho em vez de atravessar a folha inteira.
   Público: consultoria, agência, prestador de serviço B2B.
   ═══════════════════════════════════════════════════════════════════════════ */

const CONS_THEMES = ["claro", "creme"];

function ConsSec({ n, title, c, line, children, first }) {
  return (<>
    <Break />
    <div style={{ marginTop: first ? 34 : 30 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, paddingBottom: 9, borderBottom: `1.5px solid ${line}` }}>
        <span style={{ fontFamily: font.heading, fontSize: 12, fontWeight: 700, letterSpacing: "0.02em", color: c, fontVariantNumeric: "tabular-nums" }}>{n}</span>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>{title}</span>
      </div>
      <div style={{ paddingTop: 16 }}>{children}</div>
    </div>
  </>);
}

function Consultoria({ doc, accent, onAccept, onEdit, print, pdf }) {
  const m = model(doc);
  const T = themeOf(doc, CONS_THEMES);
  const A = accentUse("restrained", accent, T);
  const conds = pairs(["Forma de pagamento", m.payment], ["Rodadas de revisão", m.revisions], ["Validade da proposta", m.validity]);
  const etapas = pairs(["Início", m.start], ["Entrega", m.end]);
  const lbl = { fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: T.soft };

  // Marca d'água (comportamento preservado): "off" = nenhuma, 1 letra = essa,
  // vazio = inicial automática. Agora contida no cabeçalho, com contraste baixo.
  const wm = doc.watermark === "off" ? ""
    : (has(doc.watermark) ? String(doc.watermark).trim().charAt(0).toUpperCase()
      : ((m.clientCo || m.client || "M").trim().charAt(0) || "M").toUpperCase());

  // Numeração automática das seções — só conta as que existem.
  let n = 0;
  const next = () => String(++n).padStart(2, "0");

  return (
    <Sheet bg={T.bg} ink={T.ink} print={print}>
      {/* cabeçalho */}
      <div style={{ position: "relative", background: T.panel, borderBottom: `1px solid ${T.border}`, overflow: "hidden" }}>
        {/* Marca d'água: a antiga era uma letra de 320px cortada pela folha e
            lida como defeito de renderização. Aqui ela cabe inteira dentro do
            cabeçalho e fica no limite do perceptível. */}
        {wm && (
          <div className="pd-d1" aria-hidden="true" style={{ position: "absolute", left: 40, bottom: -34, fontFamily: font.heading, fontWeight: 900, fontSize: 168, lineHeight: 1, color: T.dark ? "rgba(255,255,255,0.04)" : mix(T.panel, T.ink, 0.055), userSelect: "none" }}>{wm}</div>
        )}
        <div className="pd-pad pd-g" style={{ position: "relative", padding: "38px 56px 32px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 28 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <Mono doc={doc} size={38} radius={8} bg={T.ink} fg={T.bg} />
              <div style={{ minWidth: 0 }}>
                <div style={{ ...lbl }}>Proposta comercial</div>
              </div>
            </div>
            <h2 className="pd-d3" style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 32, lineHeight: 1.12, letterSpacing: "-0.028em", margin: 0, color: m.title ? T.ink : T.soft, maxWidth: 430 }}>
              <Ed onEdit={onEdit} field="title">{m.title || "Título da proposta"}</Ed>
            </h2>
          </div>

          {/* ficha do documento — moldura é convenção corporativa, e funciona */}
          <div className="pd-w100" style={{ flex: "none", width: 232, border: `1px solid ${T.border}`, background: T.bg }}>
            {pairs(["Cliente", m.client], ["Início", m.start], ["Entrega", m.end], ["Validade", m.validity]).map(([k, v], i) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 14px", borderTop: i ? `1px solid ${T.line}` : "none" }}>
                <span style={{ ...lbl, flex: "none", paddingTop: 2 }}>{k}</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: T.ink, textAlign: "right", lineHeight: 1.4 }}>
                  {k === "Cliente" ? <Ed onEdit={onEdit} field="client">{v}</Ed> : v}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pd-pad" style={{ padding: "0 56px 48px" }}>
        {has(m.scope) && (
          <ConsSec first n={next()} title="Escopo do trabalho" c={A.head} line={T.ink}>
            <p style={{ fontSize: 14, lineHeight: 1.75, color: T.sub, margin: 0, maxWidth: 600 }}><Ed onEdit={onEdit} field="scope">{m.scope}</Ed></p>
          </ConsSec>
        )}

        {m.items.length > 0 && (<>
          <Break />
          <ConsSec n={next()} title="Investimento" c={A.head} line={T.ink}>
            {/* TABELA com cabeçalho — a estrutura que um cliente B2B espera ver */}
            <div className="pd-t" style={{ display: "grid", gridTemplateColumns: "38px 1fr 150px", background: T.panel, padding: "9px 14px", columnGap: 12 }}>
              <span style={lbl}>{m.showQty ? "Qtd" : "#"}</span><span style={lbl}>Descrição</span><span style={{ ...lbl, textAlign: "right" }}>Valor</span>
            </div>
            {m.items.map((it, i) => (
              <React.Fragment key={i}>
              {i > 0 && <Break />}
              <div className="pd-t" style={{ display: "grid", gridTemplateColumns: "38px 1fr 150px", columnGap: 12, alignItems: "baseline", padding: "13px 14px", borderBottom: `1px solid ${T.line}` }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: T.soft, fontVariantNumeric: "tabular-nums" }}>{m.showQty ? it.qty : String(i + 1).padStart(2, "0")}</span>
                <span style={{ fontSize: 13.5, lineHeight: 1.5, color: T.ink }}>
                  <Ed onEdit={onEdit} field="items">{it.desc || "Item"}</Ed>
                  {!!unitNote(m, it) && <span style={{ display: "block", fontSize: 10.5, color: T.soft, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{unitNote(m, it)}</span>}
                </span>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: has(it.value) ? T.ink : T.soft, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{lineMoney(m, it) || "—"}</span>
              </div>
              </React.Fragment>
            ))}

            {/* RESUMO FINANCEIRO — separado da tabela, alinhado à direita */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
              <div className="pd-w100" style={{ width: 300 }}>
                {/* Sem campo de desconto/imposto no modelo de dados, repetir
                    "Subtotal" igual ao total é ruído. Some quando não informa nada. */}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", fontSize: 13, color: T.sub, borderBottom: `1px solid ${T.line}` }}>
                  <span>Itens contratados</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{m.items.length}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "14px", background: A.chip, marginTop: 2 }}>
                  <span style={{ ...lbl, color: A.chipInk }}>Total geral</span>
                  <span style={{ fontFamily: font.heading, fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: A.chipInk, fontVariantNumeric: "tabular-nums" }}>{fmt(m.total, m.currency)}</span>
                </div>
              </div>
            </div>
          </ConsSec>
        </>)}

        {etapas.length > 0 && (
          <ConsSec n={next()} title="Cronograma" c={A.head} line={T.ink}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
              {etapas.map(([k, v], i) => {
                const last = i === etapas.length - 1;
                return (
                  <React.Fragment key={k}>
                    <div style={{ flex: "none", minWidth: 150, textAlign: last && etapas.length > 1 ? "right" : "left" }}>
                      <div style={{ display: "flex", justifyContent: last && etapas.length > 1 ? "flex-end" : "flex-start" }}>
                        <span style={{ width: 9, height: 9, borderRadius: 9, background: A.line, flex: "none" }} />
                      </div>
                      <div style={{ ...lbl, marginTop: 12 }}>{k}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, marginTop: 4 }}>{v}</div>
                    </div>
                    {!last && <div style={{ flex: 1, height: 1, background: T.border, marginTop: 4, minWidth: 40 }} />}
                  </React.Fragment>
                );
              })}
            </div>
          </ConsSec>
        )}

        {conds.length > 0 && (<>
          <Break />
          <ConsSec n={next()} title="Condições comerciais" c={A.head} line={T.ink}>
            <div className="pd-g" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 30, rowGap: 15 }}>
              {conds.map(([k, v]) => (
                <div key={k} style={{ borderLeft: `2px solid ${T.border}`, paddingLeft: 13 }}>
                  <div style={lbl}>{k}</div>
                  <div style={{ fontSize: 13.5, color: T.sub, marginTop: 5, lineHeight: 1.5 }}>{v}</div>
                </div>
              ))}
            </div>
          </ConsSec>
        </>)}

        {has(m.bio) && (
          <ConsSec n={next()} title="Quem executa" c={A.head} line={T.ink}>
            <p style={{ fontSize: 13.5, lineHeight: 1.7, color: T.sub, margin: 0, maxWidth: 600 }}><Ed onEdit={onEdit} field="bio">{m.bio}</Ed></p>
          </ConsSec>
        )}

        {/* APROVAÇÃO */}
        <ConsSec n={next()} title="Aprovação" c={A.head} line={T.ink}>
          <div className="pd-g" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginBottom: 26 }}>
            {[["", "Contratada"], [m.client || "Cliente", "Contratante"]].map(([nome, papel], i) => (
              <div key={i}>
                <div style={{ height: 40 }} />
                <div style={{ borderTop: `1px solid ${T.ink}`, paddingTop: 8 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink }}>{nome || "\u00A0"}</div>
                  <div style={{ ...lbl, marginTop: 4 }}>{papel}</div>
                </div>
              </div>
            ))}
          </div>
          {/* CTA em tinta, não na cor de destaque: numa proposta B2B a barra
              colorida de largura total é linguagem de app, não de documento.
              A cor fica no número da seção e no painel do total. */}
          {!pdf && (
          <button onClick={onAccept} style={{ width: "100%", fontFamily: font.body, fontSize: 14.5, fontWeight: 600, color: T.bg, background: T.ink, border: "none", borderRadius: 3, padding: "16px 14px", cursor: "pointer" }}>
            Aceitar proposta
          </button>
          )}
        </ConsSec>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginTop: 26, paddingTop: 13, borderTop: `1px solid ${T.line}`, ...lbl }}>
          <span>Proposta comercial</span>
          <span>{m.client ? `Para ${m.client}${m.clientCo ? ` · ${m.clientCo}` : ""}` : ""}</span>
        </div>
      </div>
    </Sheet>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   4) ESTÚDIO   (id: studio)
   ---------------------------------------------------------------------------
   O antigo era uma barra lateral escura de 168px com rótulos empilhados — o
   layout de um painel administrativo, não de um documento de estúdio.

   Conceito novo: CAPA de verdade (primeira página inteira, tipografia em 62px,
   assimétrica) seguida de páginas internas com grid deslocado 190px/1fr, muito
   espaço vazio e numerais gigantes como elemento gráfico.
   Apresentação de preço: BLOCOS DE SERVIÇO — cada entrega é um bloco com o seu
   índice em corpo grande, não uma linha de planilha.
   Público: design, branding, audiovisual, marketing.
   ═══════════════════════════════════════════════════════════════════════════ */

const EST_THEMES = ["claro", "escuro"];

function EstSec({ n, label, children, line, soft }) {
  return (<>
    <Break />
    <div className="pd-g" style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 40, paddingTop: 30, marginTop: 30, borderTop: `1px solid ${line}` }}>
      <div style={{ paddingTop: 4 }}>
        {n && <div style={{ fontFamily: font.heading, fontSize: 12, fontWeight: 700, color: soft, marginBottom: 6, fontVariantNumeric: "tabular-nums" }}>{n}</div>}
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: soft }}>{label}</div>
      </div>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  </>);
}

function Estudio({ doc, accent, onAccept, onEdit, print, pdf }) {
  const m = model(doc);
  const T = themeOf(doc, EST_THEMES);
  const A = accentUse("full", accent, T);
  const metaCapa = pairs(["Início", m.start], ["Entrega", m.end], ["Validade", m.validity]);
  const conds = pairs(["Pagamento", m.payment], ["Revisões", m.revisions]);
  const tot = splitMoney(m.total, m.currency);
  const ghost = T.dark ? mix(T.bg, T.ink, 0.22) : wash(accent, 0.62);

  /* SUMÁRIO — fonte única das seções. A capa lista o que vem dentro e o miolo
     usa a mesma numeração, então o índice não é enfeite: é navegação, e amarra
     capa e páginas internas num sistema só. Só entra seção que existe de fato. */
  const secs = [];
  if (has(m.scope)) secs.push(["scope", "Sobre o projeto"]);
  if (m.items.length) secs.push(["items", "Entregas"]);
  if (m.items.length) secs.push(["total", "Investimento"]);
  if (conds.length) secs.push(["conds", "Condições"]);
  if (has(m.bio)) secs.push(["bio", "Estúdio"]);
  const nOf = (k) => {
    const i = secs.findIndex((x) => x[0] === k);
    return i < 0 ? "" : String(i + 1).padStart(2, "0");
  };

  /* A capa aceita FOTO. Um estúdio de design, branding ou audiovisual tem
     imagem do próprio trabalho — e é isso que ele manda para o cliente. Sem
     foto, a capa se sustenta pela composição (sumário + título), nunca por um
     retângulo de cor chapada com texto no pé. */
  /* A capa só é considerada "com foto" se a imagem REALMENTE carregar. Antes
     bastava o campo estar preenchido — então um arquivo que sumiu (link morto,
     upload perdido, imagem ainda não publicada) deixava a capa num degradê vazio,
     sem a foto E sem a composição. Começa otimista, para o PDF nunca rasterizar
     o estado de espera, e cai para a composição só quando o onError dispara. */
  const [coverOk, setCoverOk] = useState(true);
  useEffect(() => { setCoverOk(true); }, [m.cover]);
  const hasCover = !!m.cover && coverOk;
  const capaInk = hasCover ? "#FFFFFF" : btnText(accent);
  const rule = capaInk === "#FFFFFF" ? "rgba(255,255,255,.28)" : "rgba(0,0,0,.18)";
  /* Nome do estúdio em UMA linha de display, sangrando pela borda direita —
     é assim que capa de portfólio trata o wordmark. Duas linhas encostavam no
     título e o corpo grande atrás de texto vira sujeira, não profundidade. */
  const bigWord = (hasCover || m.title.length > 52) ? "" : String(m.clientCo || "").trim().slice(0, 22);

  const capaBg = hasCover
    ? { backgroundImage: `url(${m.cover}), linear-gradient(170deg, ${darken(accent, 0.25)} 0%, ${darken(accent, 0.62)} 100%)`, backgroundSize: "cover", backgroundPosition: m.coverPos }
    : { background: accent };

  return (
    <Sheet bg={T.bg} ink={T.ink} print={print}>

      {/* ── PÁGINA 1: CAPA ─────────────────────────────────────────────── */}
      <div className="pd-pad pd-cover" style={{ position: "relative", boxSizing: "border-box", color: capaInk, ...capaBg,
        minHeight: print ? PAGE_H : 660, padding: "56px 56px 44px", display: "flex", flexDirection: "column" }}>

        {/* sonda de carregamento — invisível, só para saber se a foto existe */}
        {!!m.cover && <img src={m.cover} alt="" aria-hidden="true" onError={() => setCoverOk(false)} style={{ display: "none" }} />}

        {/* ── CAMADA GRÁFICA (só sem foto) ───────────────────────────────
            Grade editorial de fios + o nome do estúdio em corpo de display,
            sangrando pela borda direita. É "letra gigante cortada", mas com a
            palavra do PRÓPRIO usuário: o que vai impresso ali é a marca dele,
            não um enfeite que serve para um projeto e mente em todos os outros.
            Sem nome de empresa, sobra a grade e o monograma — nunca um desenho
            genérico. */}
        {/* A grade, o wordmark sangrado e os contadores são composição de uma
            PÁGINA A4. Em 390px eles se sobrepõem ao sumário e ao título em vez
            de compor — então somem no celular e ficam a marca, o sumário, o
            título e as datas, que é o que a pessoa precisa ler. */}
        {!hasCover && (
          <div aria-hidden="true" className="pd-hide" style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
            {/* grade: quatro fios verticais, o ritmo do documento exposto */}
            {[0.2, 0.4, 0.6, 0.8].map((x) => (
              <div key={x} style={{ position: "absolute", top: 0, height: bigWord ? "58%" : "46%", left: `${x * 100}%`, width: 1, background: rule, opacity: 0.5 }} />
            ))}
            <div style={{ position: "absolute", left: 0, right: 0, top: "31%", height: 1, background: rule, opacity: 0.55 }} />

            {/* wordmark em escala de capa, cortado pela margem */}
            {bigWord ? (
              <div className="pd-d1" style={{ position: "absolute", left: 56, top: "34%", opacity: 0.15, fontFamily: font.heading, fontWeight: 900, fontSize: 124, lineHeight: 0.86, letterSpacing: "-0.065em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                {bigWord}
              </div>
            ) : null}

            {/* âncora de leitura: quantas entregas e o ano, em microtipografia */}
            <div className="pd-wrap" style={{ position: "absolute", left: 56, top: "31%", marginTop: -26, display: "flex", gap: 26, fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.6 }}>
              {m.items.length > 0 && <span>{String(m.items.length).padStart(2, "0")} entregas</span>}
              {secs.length > 0 && <span>{String(secs.length).padStart(2, "0")} seções</span>}
            </div>
          </div>
        )}

        {/* Véu só quando há foto: sem ele o título branco some numa imagem clara. */}
        {hasCover && (
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.16) 34%, rgba(0,0,0,0.52) 74%, rgba(0,0,0,0.82) 100%)" }} />
        )}
        {!hasCover && onEdit && (
          <div onClick={() => onEdit("cover")} role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onEdit("cover"); } }}
            style={{ position: "absolute", right: 56, bottom: 44, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.6, border: `1px dashed ${rule}`, borderRadius: 6, padding: "8px 12px", cursor: "pointer", zIndex: 2 }}>
            Adicionar foto de capa
          </div>
        )}

        <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="pd-g" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Wordmark doc={doc} h={26} ink={capaInk} />
            </div>

            {/* Sem foto, o sumário ocupa o alto da capa. Com foto, a imagem já
                preenche e o texto pequeno por cima dela só sujaria. */}
            {!hasCover && secs.length > 0 ? (
              <div className="pd-w100" style={{ textAlign: "right", flex: "none", minWidth: 190 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", opacity: 0.6, marginBottom: 14 }}>Nesta proposta</div>
                {secs.map(([k, label], i) => (
                  <div key={k} style={{ display: "flex", justifyContent: "flex-end", alignItems: "baseline", gap: 10, padding: "5px 0", borderTop: i ? `1px solid ${rule}` : "none" }}>
                    <span style={{ fontSize: 13, fontWeight: 500, opacity: 0.92 }}>{label}</span>
                    <span style={{ fontFamily: font.heading, fontSize: 11, fontWeight: 700, opacity: 0.55, fontVariantNumeric: "tabular-nums", minWidth: 16 }}>{String(i + 1).padStart(2, "0")}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div style={{ flex: 1, minHeight: 90 }} />

          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.8, marginBottom: 18 }}>
            Para <Ed onEdit={onEdit} field="client">{m.client || "cliente"}</Ed>{m.clientCo ? ` · ${m.clientCo}` : ""}
          </div>
          <h2 className="pd-d2" style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 62, lineHeight: 0.98, letterSpacing: "-0.045em", margin: "0 0 52px", maxWidth: 620, textShadow: hasCover ? "0 2px 24px rgba(0,0,0,.45)" : "none" }}>
            <Ed onEdit={onEdit} field="title">{m.title || "Título da proposta"}</Ed>
          </h2>

          {metaCapa.length > 0 && (
            <div className="pd-wrap" style={{ display: "flex", gap: 44, paddingTop: 24, borderTop: `1px solid ${rule}` }}>
              {metaCapa.map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.72 }}>{k}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginTop: 6 }}>{v}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Break hard />

      {/* ── PÁGINAS INTERNAS ───────────────────────────────────────────── */}
      <div className="pd-pad" style={{ padding: "54px 56px 48px" }}>
        {has(m.scope) && (
          <div className="pd-g" style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 40 }}>
            <div style={{ paddingTop: 4 }}>
              {nOf("scope") && <div style={{ fontFamily: font.heading, fontSize: 12, fontWeight: 700, color: T.soft, marginBottom: 6, fontVariantNumeric: "tabular-nums" }}>{nOf("scope")}</div>}
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: T.soft }}>Sobre o projeto</div>
            </div>
            <p style={{ fontSize: 17, lineHeight: 1.62, color: T.ink, margin: 0, maxWidth: 480, letterSpacing: "-0.005em" }}>
              <Ed onEdit={onEdit} field="scope">{m.scope}</Ed>
            </p>
          </div>
        )}

        {m.items.length > 0 && (<>
          <Break />
          <EstSec n={nOf("items")} label="Entregas" line={T.line} soft={T.soft}>
            {/* BLOCOS DE SERVIÇO — numeral gigante como elemento gráfico */}
            {m.items.map((it, i) => (
              <React.Fragment key={i}>
              {i > 0 && <Break />}
              <div className="pd-wrap" style={{ display: "flex", alignItems: "flex-start", gap: 24, padding: "20px 0", borderBottom: i < m.items.length - 1 ? `1px solid ${T.line}` : "none" }}>
                <span className="pd-d3" style={{ fontFamily: font.heading, fontSize: 46, fontWeight: 900, lineHeight: 0.82, letterSpacing: "-0.05em", color: ghost, flex: "none", width: 72 }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span style={{ flex: 1, fontSize: 19, fontWeight: 600, lineHeight: 1.35, letterSpacing: "-0.015em", color: T.ink, paddingTop: 4 }}>
                  {qtyPrefix(m, it)}<Ed onEdit={onEdit} field="items">{it.desc || "Item"}</Ed>
                  {!!unitNote(m, it) && <span style={{ display: "block", fontSize: 12, fontWeight: 500, letterSpacing: 0, color: T.soft, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{unitNote(m, it)}</span>}
                </span>
                <span style={{ flex: "none", fontSize: 17, fontWeight: 600, color: has(it.value) ? T.sub : T.soft, paddingTop: 7, fontVariantNumeric: "tabular-nums" }}>
                  {lineMoney(m, it) || "—"}
                </span>
              </div>
              </React.Fragment>
            ))}
          </EstSec>

          {/* total como protagonista */}
          <div className="pd-g" style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 40, marginTop: 34 }}>
            <div style={{ paddingTop: 20 }}>
              {nOf("total") && <div style={{ fontFamily: font.heading, fontSize: 12, fontWeight: 700, color: T.soft, marginBottom: 6, fontVariantNumeric: "tabular-nums" }}>{nOf("total")}</div>}
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: T.soft }}>Investimento</div>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontFamily: font.heading, fontSize: 24, fontWeight: 700, color: A.head }}>{tot.sym}</span>
              <span className="pd-d2" style={{ fontFamily: font.heading, fontSize: 60, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.05em", color: A.head, fontVariantNumeric: "tabular-nums" }}>{tot.num}</span>
            </div>
          </div>
        </>)}

        {conds.length > 0 && (
          <EstSec n={nOf("conds")} label="Condições" line={T.line} soft={T.soft}>
            <div className="pd-g" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
              {conds.map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: T.soft }}>{k}</div>
                  <div style={{ fontSize: 15, color: T.ink, marginTop: 6, lineHeight: 1.5 }}>{v}</div>
                </div>
              ))}
            </div>
          </EstSec>
        )}

        {has(m.bio) && (
          <EstSec n={nOf("bio")} label="Estúdio" line={T.line} soft={T.soft}>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: T.sub, margin: 0, maxWidth: 480 }}><Ed onEdit={onEdit} field="bio">{m.bio}</Ed></p>
          </EstSec>
        )}

        {!pdf && (
        <button onClick={onAccept} style={{ marginTop: 44, width: "100%", fontFamily: font.heading, fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em", color: T.dark ? "#141416" : "#FFFFFF", background: T.dark ? T.ink : "#141416", border: "none", borderRadius: 0, padding: "20px 14px", cursor: "pointer" }}>
          Aceitar proposta
        </button>
        )}
      </div>
    </Sheet>
  );
}


/* ══════ MODELOS HERDADOS (reescrita na onda 2) ══════ */
/* ---------- 1. MINIMAL ---------- */
function Minimal({ doc, accent, onAccept, onEdit, print, pdf }) {
  const qm = model(doc);
  const items = qm.items;
  const total = qm.total;
  const dates = [["Início", doc.start], ["Entrega", doc.end]].filter(([, v]) => has(v));
  const T = themeOf(doc);
  const deep = accentInkFor(accent, T);
  const soft = panelFor(accent, T);
  return (
    <Sheet bg={T.bg} ink={T.ink} print={print}>
    <div style={{ background: T.bg, color: T.ink, overflow: "hidden", overflowWrap: "anywhere", wordBreak: "break-word" }}>
      <div style={{ height: 5, background: accent }} />
      <div className="pd-pad" style={{ padding: "43px 48px 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 26 }}>
          <Mono doc={doc} bg={deep} fg={btnText(deep)} />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: deep }}>Proposta para</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}><Ed onEdit={onEdit} field="client">{doc.client || "Cliente"}</Ed></div>
            {has(doc.company) && <div style={{ fontSize: "12.5px", color: T.sub }}>{doc.company}</div>}
          </div>
        </div>
        <h2 style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 25, lineHeight: 1.15, letterSpacing: "-0.02em", margin: `0 0 ${has(doc.scope) || items.length || dates.length ? 20 : 24}px`, color: doc.title ? deep : T.soft }}><Ed onEdit={onEdit} field="title">{doc.title || "Título da proposta"}</Ed></h2>

        {has(doc.scope) && (<>
          <div style={kicker(deep)}>Escopo</div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: T.sub, margin: "0 0 24px" }}><Ed onEdit={onEdit} field="scope">{doc.scope}</Ed></p>
        </>)}

        {items.length > 0 && (<>
          <div style={kicker(deep)}>Investimento</div>
          <div style={{ border: `1px solid ${hairFor(accent, T)}`, borderRadius: 11, overflow: "hidden", marginBottom: 12 }}>
            {items.map((it, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "16px 20px", borderBottom: i < items.length - 1 ? `1px solid ${T.line}` : "none", fontSize: "13.5px" }}>
                <span style={{ color: T.sub }}>{qtyPrefix(qm, it)}<Ed onEdit={onEdit} field="items">{it.desc || "Item"}</Ed>{!!unitNote(qm, it) && <span style={{ display: "block", fontSize: 11, opacity: 0.72, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{unitNote(qm, it)}</span>}</span><span style={{ fontWeight: 600, color: T.ink, fontVariantNumeric: "tabular-nums" }}>{lineMoney(qm, it)}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, background: soft, borderRadius: 10, padding: "17px 20px" }}>
            <span style={{ fontSize: 13, color: deep, fontWeight: 600 }}>Total</span>
            <span style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 24, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: deep }}>{fmt(total, doc.currency)}</span>
          </div>
        </>)}

        {dates.length > 0 && (
          <div className="pd-wrap" style={{ display: "flex", gap: 24, marginBottom: 24 }}>
            {dates.map(([k, v]) => (
              <div key={k}><div style={{ fontSize: "11.5px", color: T.soft, marginBottom: 3 }}>{k}</div><div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{v}</div></div>
            ))}
          </div>
        )}

        {has(doc.bio) && (
          <div style={{ marginBottom: 24 }}>
            <div style={kicker(T.soft)}>Sobre mim</div>
            <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: T.sub, margin: 0 }}><Ed onEdit={onEdit} field="bio">{doc.bio}</Ed></p>
          </div>
        )}

        {!pdf && (
        <button onClick={onAccept} style={{ width: "100%", fontFamily: font.body, fontSize: 15, fontWeight: 600, color: btnText(darken(accent, 0.3)), background: darken(accent, 0.3), border: "none", padding: 13, borderRadius: 10, cursor: "pointer" }}>Aceitar proposta</button>
        )}
      </div>
    </div>
    </Sheet>
  );
}

/* ---------- 2. BOLD ---------- */
function Bold({ doc, accent, onAccept, onEdit, print, pdf }) {
  const qm = model(doc);
  const items = qm.items;
  const total = qm.total;
  const chips = [["Início", doc.start], ["Entrega", doc.end], ["Validade", doc.validity]].filter(([, v]) => has(v));
  const T = themeOf(doc);
  return (
    <Sheet bg={T.bg} ink={T.ink} print={print}>
    <div style={{ background: T.bg, color: T.ink, overflow: "hidden", overflowWrap: "anywhere", wordBreak: "break-word" }}>
      <div className="pd-pad" style={{ background: accentFill(doc, accent), color: btnText(accent), padding: "37px 43px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <Mono doc={doc} size={34} radius={9} bg="rgba(255,255,255,0.18)" />
          <div style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.85 }}>Proposta</div>
        </div>
        <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", opacity: 0.85, marginBottom: 8 }}>Para <Ed onEdit={onEdit} field="client">{doc.client || "cliente"}</Ed>{has(doc.company) ? ` · ${doc.company}` : ""}</div>
        <div className="pd-d3" style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 30, lineHeight: 1.02, letterSpacing: "-0.03em" }}><Ed onEdit={onEdit} field="title">{doc.title || "Título da proposta"}</Ed></div>
      </div>
      <div className="pd-pad" style={{ padding: "34px 43px 43px" }}>
        {has(doc.scope) && <p style={{ fontSize: 14, lineHeight: 1.6, color: T.sub, margin: "0 0 22px" }}><Ed onEdit={onEdit} field="scope">{doc.scope}</Ed></p>}
        {items.length > 0 && (<>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 18 }}>
            {items.map((it, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: `1px dashed ${T.line}`, fontSize: 14 }}>
                <span style={{ color: T.sub }}>{qtyPrefix(qm, it)}<Ed onEdit={onEdit} field="items">{it.desc || "Item"}</Ed>{!!unitNote(qm, it) && <span style={{ display: "block", fontSize: 11, opacity: 0.72, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{unitNote(qm, it)}</span>}</span><span style={{ fontWeight: 700, color: T.ink, fontVariantNumeric: "tabular-nums" }}>{lineMoney(qm, it)}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 22 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.sub }}>Total</span>
            <span className="pd-d3" style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 34, letterSpacing: "-0.03em", color: accentInkFor(accent, T), fontVariantNumeric: "tabular-nums" }}>{fmt(total, doc.currency)}</span>
          </div>
        </>)}
        {chips.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
            {chips.map(([k, v]) => (
              <span key={k} style={{ fontSize: "12.5px", color: T.sub, background: T.panel, borderRadius: 8, padding: "9px 14px" }}><b style={{ color: T.soft, fontWeight: 600 }}>{k}:</b> {v}</span>
            ))}
          </div>
        )}
        {has(doc.bio) && (
          <div style={{ marginBottom: 22, paddingTop: 18, borderTop: `1px solid ${T.line}` }}>
            <div style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.soft, marginBottom: 6 }}>Sobre mim</div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: T.sub, margin: 0 }}><Ed onEdit={onEdit} field="bio">{doc.bio}</Ed></p>
          </div>
        )}
        {!pdf && (
        <button onClick={onAccept} style={{ width: "100%", fontFamily: font.body, fontSize: 15, fontWeight: 700, color: btnText(darken(accent, 0.3)), background: darken(accent, 0.3), border: "none", padding: 14, borderRadius: 10, cursor: "pointer" }}>Aceitar proposta</button>
        )}
      </div>
    </div>
    </Sheet>
  );
}

/* ---------- 3. EDITORIAL ---------- */
function Editorial({ doc, accent, onAccept, onEdit, print, pdf }) {
  const qm = model(doc);
  const items = qm.items;
  const total = qm.total;
  const meta = [["Cliente", doc.client || "Cliente"], ["Início", doc.start], ["Entrega", doc.end]].filter(([k, v]) => k === "Cliente" || has(v));
  const conds = [["Pagamento", doc.payment], ["Revisões", doc.revisions]].filter(([, v]) => has(v));
  const T = themeOf(doc);
  const deep = accentInkFor(accent, T);
  const soft = panelFor(accent, T);
  const rule = { height: 1, background: accent, opacity: 0.28 };
  return (
    <Sheet bg={T.bg} ink={T.ink} print={print}>
    <div style={{ background: T.bg, color: T.ink, overflow: "hidden", overflowWrap: "anywhere", wordBreak: "break-word" }}>
      <div className="pd-pad" style={{ background: soft, padding: "34px 45px 31px", borderBottom: `1px solid ${hairFor(accent, T)}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Mono doc={doc} size={30} radius={7} bg={deep} fg={btnText(deep)} />
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: deep }}>Proposta</div>
          {has(doc.validity) && <div style={{ fontSize: 12, color: T.sub }}>Válida por {doc.validity}</div>}
        </div>
      </div>
      <h2 style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 27, lineHeight: 1.12, letterSpacing: "-0.02em", margin: "16px 0 0", color: doc.title ? deep : T.soft }}><Ed onEdit={onEdit} field="title">{doc.title || "Título da proposta"}</Ed></h2>
      </div>
      <div className="pd-pad" style={{ padding: "31px 45px 45px" }}>
      <div className="pd-g2" style={{ display: "grid", gridTemplateColumns: `repeat(${meta.length}, 1fr)`, gap: 14, marginBottom: 20 }}>
        {meta.map(([k, v]) => (
          <div key={k}><div style={{ fontSize: "10.5px", letterSpacing: "0.06em", textTransform: "uppercase", color: T.soft, marginBottom: 3 }}>{k}</div><div style={{ fontSize: "13.5px", fontWeight: 600, color: T.ink }}>{v}</div></div>
        ))}
      </div>
      <div style={rule} />
      {has(doc.scope) && (<>
        <div style={{ ...kicker(T.soft), margin: "18px 0 8px" }}>Escopo</div>
        <p style={{ fontSize: "13.5px", lineHeight: 1.65, color: T.sub, margin: "0 0 22px" }}><Ed onEdit={onEdit} field="scope">{doc.scope}</Ed></p>
      </>)}
      {items.length > 0 && (<>
        <div style={{ ...kicker(T.soft), margin: has(doc.scope) ? "0 0 4px" : "18px 0 4px" }}>Investimento</div>
        <div style={{ ...rule, marginBottom: 0 }} />
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: `1px solid ${T.line}`, fontSize: "13.5px" }}>
            <span style={{ color: T.sub }}>{qtyPrefix(qm, it)}<Ed onEdit={onEdit} field="items">{it.desc || "Item"}</Ed>{!!unitNote(qm, it) && <span style={{ display: "block", fontSize: 11, opacity: 0.72, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{unitNote(qm, it)}</span>}</span><span style={{ fontWeight: 600, color: T.ink, fontVariantNumeric: "tabular-nums" }}>{lineMoney(qm, it)}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "17px 20px", marginTop: 8, background: soft, borderRadius: 8 }}>
          <span style={{ fontSize: "10.5px", letterSpacing: "0.08em", textTransform: "uppercase", color: deep }}>Total</span>
          <span style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: deep }}>{fmt(total, doc.currency)}</span>
        </div>
      </>)}
      {conds.length > 0 && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: `2px solid ${accent}`, fontSize: "12.5px", color: T.sub, lineHeight: 1.6 }}>
          {conds.map(([k, v]) => <div key={k}>{k}: {v}</div>)}
        </div>
      )}
      {has(doc.bio) && (
        <div style={{ marginTop: 20 }}>
          <div style={{ ...kicker(deep), margin: "0 0 6px" }}>Sobre mim</div>
          <p style={{ fontSize: "12.5px", lineHeight: 1.65, color: T.sub, margin: 0 }}><Ed onEdit={onEdit} field="bio">{doc.bio}</Ed></p>
        </div>
      )}
      {!pdf && (
      <button onClick={onAccept} style={{ marginTop: 20, width: "100%", fontFamily: font.body, fontSize: 14.5, fontWeight: 600, color: btnText(darken(accent, 0.3)), background: darken(accent, 0.3), border: "none", padding: 13, borderRadius: 8, cursor: "pointer" }}>Aceitar proposta</button>
      )}
      </div>
    </div>
    </Sheet>
  );
}

/* ---------- 4. COLORIDO ---------- */
function Colorido({ doc, accent, onAccept, onEdit, print, pdf }) {
  const qm = model(doc);
  const items = qm.items;
  const total = qm.total;
  const dates = [["Início", doc.start], ["Entrega", doc.end]].filter(([, v]) => has(v));
  const T = themeOf(doc);
  const deep = accentInkFor(accent, T);
  const soft = panelFor(accent, T);
  const headBg = (doc.gradient && has(doc.accent2))
    ? `linear-gradient(135deg, ${accent} 0%, ${doc.accent2} 100%)`
    : `radial-gradient(120% 130% at 85% -10%, ${accent} 0%, ${accent}CC 55%, ${accent}99 100%)`;
  return (
    <Sheet bg={T.bg} ink={T.ink} print={print}>
    <div style={{ background: T.bg, color: T.ink, overflow: "hidden", overflowWrap: "anywhere", wordBreak: "break-word" }}>
      <div className="pd-pad" style={{ background: headBg, color: btnText(accent), padding: "43px 43px 48px" }}>
        <Mono doc={doc} size={44} radius={12} bg="rgba(255,255,255,0.22)" />
        <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", opacity: 0.9, margin: "22px 0 6px" }}>Proposta para <Ed onEdit={onEdit} field="client">{doc.client || "cliente"}</Ed></div>
        <div style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 28, lineHeight: 1.04, letterSpacing: "-0.03em" }}><Ed onEdit={onEdit} field="title">{doc.title || "Título da proposta"}</Ed></div>
      </div>
      <div className="pd-pad" style={{ padding: "34px 43px 43px" }}>
        {has(doc.scope) && <p style={{ fontSize: 14, lineHeight: 1.6, color: T.sub, margin: "0 0 22px" }}><Ed onEdit={onEdit} field="scope">{doc.scope}</Ed></p>}
        {items.length > 0 && (
          <div style={{ background: soft, borderRadius: 14, padding: "23px 26px", marginBottom: 20 }}>
            {items.map((it, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: i < items.length - 1 ? `1px solid ${hairFor(accent, T)}` : "none", fontSize: "13.5px" }}>
                <span style={{ color: T.sub }}>{qtyPrefix(qm, it)}<Ed onEdit={onEdit} field="items">{it.desc || "Item"}</Ed>{!!unitNote(qm, it) && <span style={{ display: "block", fontSize: 11, opacity: 0.72, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{unitNote(qm, it)}</span>}</span><span style={{ fontWeight: 600, color: T.ink, fontVariantNumeric: "tabular-nums" }}>{lineMoney(qm, it)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 12, marginTop: 6, borderTop: `1px solid ${hairFor(accent, T)}` }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: deep }}>Total</span>
              <span style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 24, letterSpacing: "-0.02em", color: deep, fontVariantNumeric: "tabular-nums" }}>{fmt(total, doc.currency)}</span>
            </div>
          </div>
        )}
        {dates.length > 0 && (
          <div style={{ display: "flex", gap: 20, marginBottom: 22 }}>
            {dates.map(([k, v]) => (
              <div key={k}><div style={{ fontSize: "11.5px", color: T.soft, marginBottom: 3 }}>{k}</div><div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{v}</div></div>
            ))}
          </div>
        )}
        {has(doc.bio) && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: T.soft, marginBottom: 6 }}>Sobre mim</div>
            <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: T.sub, margin: 0 }}><Ed onEdit={onEdit} field="bio">{doc.bio}</Ed></p>
          </div>
        )}
        {!pdf && (
        <button onClick={onAccept} style={{ width: "100%", fontFamily: font.body, fontSize: 15, fontWeight: 700, color: btnText(darken(accent, 0.3)), background: darken(accent, 0.3), border: "none", padding: 14, borderRadius: 12, cursor: "pointer" }}>Aceitar proposta</button>
        )}
      </div>
    </div>
    </Sheet>
  );
}

/* ---------- 5. CAPA (com foto) ---------- */
function Capa({ doc, accent, onAccept, onEdit, print, pdf }) {
  const qm = model(doc);
  const items = qm.items;
  const total = qm.total;
  const dates = [["Início", doc.start], ["Entrega", doc.end]].filter(([, v]) => has(v));
  const T = themeOf(doc);
  const deep = accentInkFor(accent, T);
  const EMPTY = "linear-gradient(162deg, #3C3C43 0%, #1B1B1F 100%)";
  const hero = doc.cover
    ? { backgroundImage: `url(${doc.cover}), ${EMPTY}`, backgroundSize: "cover", backgroundPosition: coverPosition(doc.coverPos) }
    : { background: EMPTY };
  return (
    <Sheet bg={T.bg} ink={T.ink} print={print}>
    <div style={{ background: T.bg, color: T.ink, overflow: "hidden", overflowWrap: "anywhere", wordBreak: "break-word" }}>
      <div style={{ position: "relative", height: 286, ...hero }}>
        {!doc.cover && onEdit && (
          <div onClick={() => onEdit("cover")} role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onEdit("cover"); } }}
            style={{ position: "absolute", inset: 14, border: "1px dashed rgba(255,255,255,0.32)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.62)", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", zIndex: 2 }}>
            Adicionar foto de capa
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.38) 52%, rgba(0,0,0,0.74) 100%)" }} />
        <div className="pd-pad" style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "31px 34px", color: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
            {doc.logo
              ? <img src={doc.logo} alt="" style={{ width: 30, height: 30, borderRadius: 8, objectFit: "cover", display: "block" }} />
              : <span style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center" }}><Mark size={17} fill="#fff" /></span>}
            <span style={{ fontSize: "12.5px", fontWeight: 500, opacity: 0.92 }}>Proposta para <Ed onEdit={onEdit} field="client">{doc.client || "cliente"}</Ed>{has(doc.company) ? ` · ${doc.company}` : ""}</span>
          </div>
          <div style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 25, lineHeight: 1.05, letterSpacing: "-0.02em", textShadow: "0 2px 12px rgba(0,0,0,0.35)" }}><Ed onEdit={onEdit} field="title">{doc.title || "Título da proposta"}</Ed></div>
        </div>
      </div>
      <div className="pd-pad" style={{ padding: "34px 37px 37px" }}>
        {has(doc.scope) && (<>
          <div style={kicker(deep)}>Escopo</div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: T.sub, margin: "0 0 22px" }}><Ed onEdit={onEdit} field="scope">{doc.scope}</Ed></p>
        </>)}
        {items.length > 0 && (<>
          <div style={kicker(deep)}>Investimento</div>
          <div style={{ border: `1px solid ${hairFor(accent, T)}`, borderRadius: 11, overflow: "hidden", marginBottom: 12 }}>
            {items.map((it, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "16px 20px", borderBottom: i < items.length - 1 ? `1px solid ${T.line}` : "none", fontSize: "13.5px" }}>
                <span style={{ color: T.sub }}>{qtyPrefix(qm, it)}<Ed onEdit={onEdit} field="items">{it.desc || "Item"}</Ed>{!!unitNote(qm, it) && <span style={{ display: "block", fontSize: 11, opacity: 0.72, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{unitNote(qm, it)}</span>}</span><span style={{ fontWeight: 600, color: T.ink, fontVariantNumeric: "tabular-nums" }}>{lineMoney(qm, it)}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, background: panelFor(accent, T), borderRadius: 10, padding: "17px 20px" }}>
            <span style={{ fontSize: 13, color: deep, fontWeight: 600 }}>Total</span>
            <span style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 24, letterSpacing: "-0.02em", color: deep, fontVariantNumeric: "tabular-nums" }}>{fmt(total, doc.currency)}</span>
          </div>
        </>)}
        {dates.length > 0 && (
          <div className="pd-wrap" style={{ display: "flex", gap: 24, marginBottom: 22 }}>
            {dates.map(([k, v]) => (<div key={k}><div style={{ fontSize: "11.5px", color: T.soft, marginBottom: 3 }}>{k}</div><div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{v}</div></div>))}
          </div>
        )}
        {has(doc.bio) && (
          <div style={{ marginBottom: 22 }}>
            <div style={kicker(T.soft)}>Sobre mim</div>
            <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: T.sub, margin: 0 }}><Ed onEdit={onEdit} field="bio">{doc.bio}</Ed></p>
          </div>
        )}
        {!pdf && (
        <button onClick={onAccept} style={{ width: "100%", fontFamily: font.body, fontSize: 15, fontWeight: 600, color: btnText(darken(accent, 0.3)), background: darken(accent, 0.3), border: "none", padding: 14, borderRadius: 11, cursor: "pointer" }}>Aceitar proposta</button>
        )}
      </div>
    </div>
    </Sheet>
  );
}

/* ---------- 6. DOSSIÊ (foto escura) ---------- */
function Dossie({ doc, accent, onAccept, onEdit, print, pdf }) {
  const qm = model(doc);
  const items = qm.items;
  const total = qm.total;
  const chips = [["Início", doc.start], ["Entrega", doc.end], ["Validade", doc.validity]].filter(([, v]) => has(v));
  const EMPTY = "linear-gradient(155deg, #26262D 0%, #0B0B0C 100%)";
  const hero = doc.cover
    ? { backgroundImage: `url(${doc.cover}), ${EMPTY}`, backgroundSize: "cover", backgroundPosition: coverPosition(doc.coverPos) }
    : { background: EMPTY };
  return (
    <Sheet bg="#0E0E0E" ink="#FFFFFF" print={print}>
    <div style={{ background: "#0E0E0E", color: "#fff", overflow: "hidden", overflowWrap: "anywhere", wordBreak: "break-word" }}>
      <div style={{ position: "relative", height: 320, ...hero }}>
        {!doc.cover && onEdit && (
          <div onClick={() => onEdit("cover")} role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onEdit("cover"); } }}
            style={{ position: "absolute", inset: 14, border: "1px dashed rgba(255,255,255,0.32)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.62)", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", zIndex: 2 }}>
            Adicionar foto de capa
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(14,14,14,0.96) 100%)" }} />
        <div className="pd-pad" style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "37px 37px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: onDark(accent), marginBottom: 10 }}>Proposta · <Ed onEdit={onEdit} field="client">{doc.client || "cliente"}</Ed></div>
          <div style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 27, lineHeight: 1.02, letterSpacing: "-0.01em", textTransform: "uppercase" }}><Ed onEdit={onEdit} field="title">{doc.title || "Título da proposta"}</Ed></div>
        </div>
      </div>
      <div className="pd-pad" style={{ padding: "34px 37px 40px" }}>
        {has(doc.scope) && <p style={{ fontSize: 14, lineHeight: 1.65, color: "#C9C9CE", margin: "0 0 22px" }}><Ed onEdit={onEdit} field="scope">{doc.scope}</Ed></p>}
        {items.length > 0 && (<>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 18 }}>
            {items.map((it, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid #222", fontSize: 14 }}>
                <span style={{ color: "#D4D4D8" }}>{qtyPrefix(qm, it)}<Ed onEdit={onEdit} field="items">{it.desc || "Item"}</Ed>{!!unitNote(qm, it) && <span style={{ display: "block", fontSize: 11, opacity: 0.72, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{unitNote(qm, it)}</span>}</span><span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{lineMoney(qm, it)}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 22, background: darken(accent, 0.72), border: `1px solid ${darken(accent, 0.5)}`, borderRadius: 10, padding: "17px 21px" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#B9B9C0" }}>Total</span>
            <span className="pd-d3" style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 32, letterSpacing: "-0.03em", color: onDark(accent), fontVariantNumeric: "tabular-nums" }}>{fmt(total, doc.currency)}</span>
          </div>
        </>)}
        {chips.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
            {chips.map(([k, v]) => (<span key={k} style={{ fontSize: "12.5px", color: "#D4D4D8", background: "#1A1A1A", border: "1px solid #262626", borderRadius: 8, padding: "9px 14px" }}><b style={{ color: "#8A8A90", fontWeight: 600 }}>{k}:</b> {v}</span>))}
          </div>
        )}
        {has(doc.bio) && (
          <div style={{ marginBottom: 22, paddingTop: 18, borderTop: "1px solid #222" }}>
            <div style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8A8A90", marginBottom: 6 }}>Sobre mim</div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "#B4B4BA", margin: 0 }}><Ed onEdit={onEdit} field="bio">{doc.bio}</Ed></p>
          </div>
        )}
        {!pdf && (
        <button onClick={onAccept} style={{ width: "100%", fontFamily: font.body, fontSize: 15, fontWeight: 700, color: btnText(darken(accent, 0.3)), background: darken(accent, 0.3), border: "none", padding: 14, borderRadius: 11, cursor: "pointer" }}>Aceitar proposta</button>
        )}
      </div>
    </div>
    </Sheet>
  );
}

/* ---------- 9. AURORA (suave, gradiente) ---------- */
function Aurora({ doc, accent, onAccept, onEdit, print, pdf }) {
  const qm = model(doc);
  const items = qm.items;
  const total = qm.total;
  const dates = [["Início", doc.start], ["Entrega", doc.end], ["Validade", doc.validity]].filter(([, v]) => has(v));
  const a2 = (doc.gradient && has(doc.accent2)) ? doc.accent2 : accent;
  const T = themeOf(doc);
  const deep = accentInkFor(accent, T);
  const glass = T.dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.72)";
  return (
    <Sheet bg={T.bg} ink={T.ink} print={print}>
    <div className="pd-pad" style={{ position: "relative", background: `linear-gradient(165deg, ${accent}22 0%, ${T.bg} 42%, ${a2}18 100%)`, color: T.ink, padding: "43px 43px 40px", overflow: "hidden", overflowWrap: "anywhere", wordBreak: "break-word", boxShadow: "0 16px 48px -20px rgba(20,20,30,0.22)" }}>
      <div className="pd-w100" style={{ position: "absolute", top: -70, right: -70, width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle, ${a2}33 0%, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <Mono doc={doc} size={40} radius={13} bg={deep} fg={btnText(deep)} />
        <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: btnText(accent), background: accentFill(doc, accent), borderRadius: 999, padding: "9px 17px" }}>Proposta</span>
      </div>
      <div style={{ fontSize: "12.5px", fontWeight: 500, color: T.sub, marginBottom: 6 }}>Para <Ed onEdit={onEdit} field="client">{doc.client || "cliente"}</Ed>{has(doc.company) ? ` · ${doc.company}` : ""}</div>
      <h2 style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 26, lineHeight: 1.08, letterSpacing: "-0.03em", margin: "0 0 18px", color: doc.title ? deep : T.soft }}><Ed onEdit={onEdit} field="title">{doc.title || "Título da proposta"}</Ed></h2>
      {has(doc.scope) && <p style={{ fontSize: 14, lineHeight: 1.65, color: T.sub, margin: "0 0 20px" }}><Ed onEdit={onEdit} field="scope">{doc.scope}</Ed></p>}
      {items.length > 0 && (
        <div style={{ background: glass, backdropFilter: "blur(6px)", border: `1px solid ${hairFor(accent, T)}`, borderRadius: 16, padding: "23px 26px", marginBottom: 18, boxShadow: "0 8px 24px -14px rgba(20,20,30,0.18)" }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: i < items.length - 1 ? `1px solid ${T.line}` : "none", fontSize: "13.5px" }}>
              <span style={{ color: T.sub }}>{qtyPrefix(qm, it)}<Ed onEdit={onEdit} field="items">{it.desc || "Item"}</Ed>{!!unitNote(qm, it) && <span style={{ display: "block", fontSize: 11, opacity: 0.72, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{unitNote(qm, it)}</span>}</span><span style={{ fontWeight: 600, color: T.ink, fontVariantNumeric: "tabular-nums" }}>{lineMoney(qm, it)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 12, marginTop: 6, borderTop: `1px solid ${T.line}` }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: deep }}>Total</span>
            <span style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 25, letterSpacing: "-0.02em", color: deep, fontVariantNumeric: "tabular-nums" }}>{fmt(total, doc.currency)}</span>
          </div>
        </div>
      )}
      {dates.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {dates.map(([k, v]) => (
            <span key={k} style={{ fontSize: "12.5px", color: T.sub, background: glass, border: `1px solid ${T.line}`, borderRadius: 999, padding: "9px 17px" }}><b style={{ color: T.soft, fontWeight: 600 }}>{k}:</b> {v}</span>
          ))}
        </div>
      )}
      {has(doc.bio) && (
        <div style={{ marginBottom: 20 }}>
          <div style={kicker(T.soft)}>Sobre mim</div>
          <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: T.sub, margin: 0 }}><Ed onEdit={onEdit} field="bio">{doc.bio}</Ed></p>
        </div>
      )}
      {!pdf && (
      <button onClick={onAccept} style={{ width: "100%", fontFamily: font.body, fontSize: 15, fontWeight: 700, color: btnText(darken(accent, 0.3)), background: darken(accent, 0.3), border: "none", padding: 14, borderRadius: 14, cursor: "pointer", boxShadow: `0 10px 24px -10px ${accent}80` }}>Aceitar proposta</button>
      )}
    </div>
    </Sheet>
  );
}

/* ---------- 12. PÔSTER (capa de impacto com pílula) ---------- */
function Poster({ doc, accent, onAccept, onEdit, print, pdf }) {
  const qm = model(doc);
  const items = qm.items;
  const total = qm.total;
  const T = themeOf(doc);
  const deep = accentInkFor(accent, T);
  const dates = [["Início", doc.start], ["Entrega", doc.end], ["Validade", doc.validity]].filter(([, v]) => has(v));
  const coverBg = (doc.gradient && has(doc.accent2))
    ? `linear-gradient(150deg, ${accent} 0%, ${doc.accent2} 100%)`
    : `linear-gradient(150deg, ${darken(accent, 0.12)} 0%, ${darken(accent, 0.55)} 100%)`;
  return (
    <Sheet bg={T.bg} ink={T.ink} print={print}>
    <div style={{ background: T.bg, color: T.ink, overflow: "hidden", overflowWrap: "anywhere", wordBreak: "break-word" }}>
      <div className="pd-pad" style={{ position: "relative", background: coverBg, color: "#fff", padding: "48px 43px 45px", overflow: "hidden" }}>
        <div className="pd-w100" aria-hidden="true" style={{ position: "absolute", right: -40, bottom: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <Mono doc={doc} size={32} radius={9} bg="rgba(255,255,255,0.2)" />
          <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.9 }}>Proposta comercial</span>
        </div>
        <div className="pd-d3" style={{ position: "relative", fontFamily: font.heading, fontWeight: 900, fontSize: 38, lineHeight: 0.98, letterSpacing: "-0.035em", textTransform: "uppercase", marginBottom: 16 }}><Ed onEdit={onEdit} field="title">{doc.title || "Título da proposta"}</Ed></div>
        <span style={{ position: "relative", display: "inline-block", fontSize: "13px", fontWeight: 700, letterSpacing: "0.02em", color: darken(accent, 0.2), background: "#fff", borderRadius: 999, padding: "10px 23px" }}>
          <Ed onEdit={onEdit} field="client">{doc.client || "Cliente"}</Ed>{has(doc.company) ? ` · ${doc.company}` : ""}
        </span>
      </div>
      <div className="pd-pad" style={{ padding: "37px 43px 43px" }}>
        {has(doc.scope) && <p style={{ fontSize: 14, lineHeight: 1.65, color: T.sub, margin: "0 0 22px" }}><Ed onEdit={onEdit} field="scope">{doc.scope}</Ed></p>}
        {items.length > 0 && (<>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 18 }}>
            {items.map((it, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: i < items.length - 1 ? `1px solid ${T.line}` : "none", fontSize: 14 }}>
                <span style={{ color: T.sub }}>{qtyPrefix(qm, it)}<Ed onEdit={onEdit} field="items">{it.desc || "Item"}</Ed>{!!unitNote(qm, it) && <span style={{ display: "block", fontSize: 11, opacity: 0.72, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{unitNote(qm, it)}</span>}</span><span style={{ fontWeight: 700, color: T.ink, fontVariantNumeric: "tabular-nums" }}>{lineMoney(qm, it)}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 22, background: panelFor(accent, T), borderRadius: 10, padding: "17px 21px" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: deep }}>Total</span>
            <span className="pd-d3" style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 30, letterSpacing: "-0.03em", color: deep, fontVariantNumeric: "tabular-nums" }}>{fmt(total, doc.currency)}</span>
          </div>
        </>)}
        {dates.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
            {dates.map(([k, v]) => (<span key={k} style={{ fontSize: "12.5px", color: T.sub, background: T.panel, borderRadius: 8, padding: "9px 16px" }}><b style={{ color: T.soft, fontWeight: 600 }}>{k}:</b> {v}</span>))}
          </div>
        )}
        {has(doc.bio) && (
          <div style={{ marginBottom: 22 }}>
            <div style={kicker(T.soft)}>Sobre mim</div>
            <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: T.sub, margin: 0 }}><Ed onEdit={onEdit} field="bio">{doc.bio}</Ed></p>
          </div>
        )}
        {!pdf && (
        <button onClick={onAccept} style={{ width: "100%", fontFamily: font.body, fontSize: 15, fontWeight: 700, color: btnText(darken(accent, 0.3)), background: darken(accent, 0.3), border: "none", padding: 14, borderRadius: 11, cursor: "pointer" }}>Aceitar proposta</button>
        )}
      </div>
    </div>
    </Sheet>
  );
}


/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  REGISTRO DE MODELOS                                                     ║
   ║                                                                          ║
   ║  O `id` de cada modelo é CONTRATO, não rótulo: está gravado em            ║
   ║  `proposals.template` de toda proposta já criada, no gating de plano do   ║
   ║  backend (`BASIC_TEMPLATES`) e nas métricas por template. Renomear um id  ║
   ║  quebraria proposta de cliente pagante. Nome, tag, categoria e conceito   ║
   ║  são livres — e é aí que a reformulação acontece.                         ║
   ║                                                                          ║
   ║  Cada entrada declara o que a identidade dela aguenta:                    ║
   ║    themes  — temas de folha que NÃO destroem o modelo                     ║
   ║    accent  — quanto da cor escolhida o modelo deixa aparecer              ║
   ║    cover   — usa imagem de capa                                           ║
   ║    caps    — recursos extras do editor (marca d'água etc.)                ║
   ║    fields  — campos que o modelo exibe (fonte única para o editor)        ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */

const ALL_THEMES = ["claro", "creme", "escuro"];
const F_ALL = { end: true, validity: true, payment: true, revisions: true };

export const DESIGNS = [
  // ── Essenciais ────────────────────────────────────────────────────────────
  { id: "minimal", name: "Nítido", tag: "Essencial", free: true, cat: "essencial", accent: "#1B1B1E", Comp: Minimal,
    themes: ALL_THEMES, accentPolicy: "restrained",
    fields: { end: true, validity: false, payment: false, revisions: false } },

  { id: "aurora", name: "Aurora", tag: "Suave", cat: "essencial", accent: "#45566E", Comp: Aurora,
    themes: ALL_THEMES, accentPolicy: "full",
    fields: { end: true, validity: true, payment: false, revisions: false } },

  { id: "colorido", name: "Vívido", tag: "Colorido", cat: "essencial", accent: "#6A5470", Comp: Colorido,
    themes: ALL_THEMES, accentPolicy: "full",
    fields: { end: true, validity: false, payment: false, revisions: false } },

  // ── Editoriais ────────────────────────────────────────────────────────────
  { id: "editorial", name: "Editorial", tag: "Revista", cat: "editorial", accent: "#3F5548", Comp: Editorial,
    themes: ALL_THEMES, accentPolicy: "restrained", fields: F_ALL },

  // ── Corporativos ──────────────────────────────────────────────────────────
  // RECONSTRUÍDO DUAS VEZES: era uma folha com texto centralizado, virou carta
  // timbrada e agora é apresentação comercial. O id segue "carta" porque o
  // banco, as métricas e o gating de plano dependem dele.
  { id: "carta", name: "Agência", tag: "Pacote de conteúdo", cat: "corporativo", accent: "#5B5B62", Comp: Carta,
    themes: ["claro", "creme"], accentPolicy: "hairline", fields: F_ALL, novo: true },

  // RECONSTRUÍDO: o id continua "recibo" por causa do banco; o conceito de
  // cupom fiscal foi abandonado por completo.
  { id: "recibo", name: "Técnico", tag: "Dev e produto", cat: "corporativo", accent: "#414E5E", Comp: Tecnico,
    themes: ["claro", "escuro"], accentPolicy: "restrained", fields: F_ALL, novo: true },

  // RECONSTRUÍDO: era "Grande", um orçamento com letra gigante ao fundo.
  { id: "grande", name: "Consultoria", tag: "B2B detalhado", cat: "corporativo", accent: "#3C4F52", Comp: Consultoria,
    themes: ["claro", "creme"], accentPolicy: "restrained", caps: ["watermark"], fields: F_ALL, novo: true },

  // ── Criativos ─────────────────────────────────────────────────────────────
  { id: "bold", name: "Impacto", tag: "Alto contraste", free: true, cat: "criativo", accent: "#2D2A27", Comp: Bold,
    themes: ALL_THEMES, accentPolicy: "full",
    fields: { end: true, validity: true, payment: false, revisions: false } },

  // RECONSTRUÍDO: era uma barra lateral escura de painel; virou capa de estúdio.
  { id: "studio", name: "Estúdio", tag: "Capa criativa", cat: "criativo", accent: "#A4664F", Comp: Estudio, cover: true,
    themes: ["claro", "escuro"], accentPolicy: "full", fields: F_ALL, novo: true },

  { id: "poster", name: "Pôster", tag: "Tipografia grande", cat: "criativo", accent: "#4E4757", Comp: Poster,
    themes: ALL_THEMES, accentPolicy: "full",
    fields: { end: true, validity: true, payment: false, revisions: false } },

  // ── Com foto ──────────────────────────────────────────────────────────────
  { id: "capa", name: "Capa", tag: "Com foto", cat: "foto", accent: "#7E6C5E", Comp: Capa, cover: true,
    themes: ALL_THEMES, accentPolicy: "restrained",
    fields: { end: true, validity: false, payment: false, revisions: false } },

  { id: "dossie", name: "Dossiê", tag: "Foto escura", cat: "foto", accent: "#9A6A56", Comp: Dossie, cover: true,
    themes: ALL_THEMES, accentPolicy: "full",
    fields: { end: true, validity: true, payment: false, revisions: false } },
];

// Categorias da galeria — descrevem PARA QUE serve o modelo, não que cor ele
// tem. "Vibrantes / Escuros" classificava pela pintura; isto classifica pelo uso.
export const TEMPLATE_CATS = [
  ["todos", "Todos"],
  ["essencial", "Essenciais"],
  ["editorial", "Editoriais"],
  ["corporativo", "Corporativos"],
  ["criativo", "Criativos"],
  ["foto", "Com foto"],
];

const byId = (id) => DESIGNS.find((x) => x.id === id);

/* ── Plano ───────────────────────────────────────────────────────────────────
   `free: true` marca os modelos que o plano Gratuito inclui. A AUTORIDADE de
   quem pode usar o quê continua sendo o servidor (BASIC_TEMPLATES em
   backend/src/lib/plans.js) — isto aqui é a camada de apresentação: o filtro da
   galeria e o cadeado no card. Um teste (backend/test/unit/plan-templates.test.js)
   quebra se as duas listas divergirem, que é o jeito de isto não virar uma
   segunda fonte da verdade com vida própria. */
export const FREE_TEMPLATES = DESIGNS.filter((d) => d.free).map((d) => d.id);
export const templateIsFree = (id) => !!byId(id)?.free;

// Modelo desconhecido (proposta antiga ou futura): permissivo, mostra tudo.
export function templateFields(id) {
  const d = byId(id);
  return (d && d.fields) || F_ALL;
}

// Temas de folha que este modelo aceita. O editor só oferece estes.
export function templateThemes(id) {
  const d = byId(id);
  return (d && d.themes) || ALL_THEMES;
}

// Tema seguro para um modelo — usado ao TROCAR de modelo, para nunca deixar a
// proposta num tema que o novo desenho não suporta.
export function safeTheme(id, theme) {
  const list = templateThemes(id);
  return list.includes(theme) ? theme : list[0];
}

// Recursos extras do editor (hoje só a marca d'água). Antes era
// `doc.template === "grande"` escrito à mão dentro do Dashboard.
export function templateHas(id, cap) {
  const d = byId(id);
  return !!(d && d.caps && d.caps.includes(cap));
}

/* `print` e `pdf` são coisas DIFERENTES, de propósito:

     print  — desenha como folha nua: sem sombra, sem canto arredondado. Vale
              para o PDF, mas também para a miniatura da galeria e para a
              prévia do modelo, que são representações do documento na tela.
     pdf    — este render vai virar ARQUIVO. Só os dois nós escondidos de
              exportação marcam isto.

   Quem separa os dois é o botão "Aceitar proposta": num arquivo ele não tem o
   que fazer (ninguém clica num PDF), mas na miniatura e na prévia ele faz parte
   do desenho do modelo e continua aparecendo. Se o botão fosse escondido por
   `print`, a galeria inteira mudaria junto. */
export function ProposalDesign({ id, doc, accent, onAccept, onEdit, print = false, pdf = false }) {
  const d = byId(id) || DESIGNS[0];
  const Comp = d.Comp;
  return <Comp doc={doc} accent={accent || doc.accent || d.accent} onAccept={onAccept} onEdit={onEdit} print={print} pdf={pdf} />;
}

/* ══════════════════════════════════════════════════════════════════════════
   EXEMPLOS DA GALERIA
   Cada modelo tem um exemplo próprio — cliente, serviços e valores diferentes —
   para a vitrine mostrar o modelo no público dele, e não o mesmo texto 12 vezes.
   ══════════════════════════════════════════════════════════════════════════ */

/* Fotos de exemplo dos modelos com capa. Ficam em `public/`, servidas do
   próprio domínio: uma URL externa (Unsplash e afins) pode ser bloqueada por
   CORS na hora de rasterizar o PDF, e a capa sairia em branco no arquivo que o
   cliente recebe. Se o arquivo não estiver lá, o degradê neutro da capa aparece
   por baixo — a galeria não quebra. */
const COVER_CAPA = "/samples/capa.jpg";
const COVER_DOSSIE = "/samples/dossie.jpg";
const COVER_STUDIO = "/samples/studio.jpg";

export const SAMPLE_DOC = {
  client: "Paula Rodrigues", company: "Viana Café", title: "Produção de vídeo institucional",
  scope: "Vídeo institucional de até 90 segundos para o site e as redes. Inclui roteiro, direção, uma diária de gravação e edição com trilha e legendas.",
  items: [{ desc: "Roteiro + direção", value: "1800" }, { desc: "Diária de gravação", value: "2400" }, { desc: "Edição + finalização", value: "1600" }],
  start: "10 de agosto", end: "5 de setembro",
  payment: "50% na aprovação, 50% na entrega", revisions: "2 rodadas", validity: "15 dias",
  bio: "Videomaker há 6 anos, especializado em vídeos para pequenas marcas.", logo: null,
};

export const SAMPLE_BY_ID = {
  minimal: {
    client: "Marina Alves", company: "Estúdio Nôvo", title: "Identidade visual completa",
    scope: "Criação de logo, paleta de cores, tipografia e aplicações para o lançamento da marca.",
    items: [{ desc: "Pesquisa e conceito", value: "900" }, { desc: "Logo e variações", value: "1600" }, { desc: "Manual da marca", value: "1200" }],
    start: "1 de setembro", end: "30 de setembro", payment: "50% início, 50% entrega", revisions: "3 rodadas", validity: "20 dias",
    bio: "Designer de marcas há 8 anos.", logo: null,
  },
  bold: {
    client: "Rafael Dias", company: "Verde Burger", title: "Campanha de lançamento",
    scope: "Conceito criativo, artes para redes e gestão de tráfego no mês de estreia.",
    items: [{ desc: "Direção criativa", value: "1500" }, { desc: "10 artes para redes", value: "1200" }, { desc: "Gestão de tráfego", value: "1800" }],
    start: "5 de agosto", end: "5 de setembro", validity: "15 dias",
    bio: "Publicitário focado em pequenos negócios.", logo: null,
  },
  editorial: {
    client: "Marchetti Engenharia", company: "Marchetti", title: "Consultoria de arquitetura",
    scope: "Projeto de interiores e acompanhamento de obra para o novo escritório.",
    items: [{ desc: "Projeto executivo", value: "5200" }, { desc: "Detalhamento", value: "2400" }, { desc: "Acompanhamento (3 visitas)", value: "1800" }],
    start: "10 de agosto", end: "20 de outubro", payment: "3x sem juros", revisions: "2 rodadas", validity: "30 dias",
    bio: "Arquiteta e urbanista, CAU 12345-6.", logo: null,
  },
  colorido: {
    client: "Bruna Lima", company: "Bloom Cosméticos", title: "Gestão de redes sociais",
    scope: "Planejamento, criação de conteúdo e relatórios mensais para Instagram e TikTok.",
    items: [{ desc: "Planejamento mensal", value: "700" }, { desc: "12 posts + 8 reels", value: "1400" }, { desc: "Relatório de resultados", value: "400" }],
    start: "1 de setembro", end: "30 de setembro", validity: "10 dias",
    bio: "Social media e criadora de conteúdo.", logo: null,
  },
  capa: {
    client: "Júlia & Pedro", company: "Casamento", title: "Cobertura fotográfica do casamento",
    scope: "Cobertura da cerimônia e da festa, com álbum digital e 300 fotos tratadas.",
    items: [{ desc: "Cobertura (8h)", value: "2800" }, { desc: "Tratamento de 300 fotos", value: "1200" }, { desc: "Álbum digital", value: "600" }],
    start: "12 de outubro", end: "2 de novembro", payment: "30% reserva, 70% na entrega", validity: "20 dias",
    bio: "Fotógrafo de casamentos há 6 anos.", logo: null, cover: COVER_CAPA,
  },
  dossie: {
    client: "Banda Eclipse", company: "Selo Meia-Noite", title: "Produção de videoclipe",
    scope: "Roteiro, direção, uma diária de gravação e finalização com color grading.",
    items: [{ desc: "Roteiro e direção", value: "2500" }, { desc: "Diária de gravação", value: "3500" }, { desc: "Edição e color", value: "2200" }],
    start: "3 de setembro", end: "1 de outubro", validity: "15 dias",
    bio: "Diretor audiovisual e videomaker.", logo: null, cover: COVER_DOSSIE, theme: "escuro",
  },

  // ── exemplos dos quatro reconstruídos ─────────────────────────────────────
  carta: {
    client: "Mileny Castro", company: "Raiz Alimentos", title: "Produção de conteúdo mensal",
    scope: "Planejamento de pauta, gravação e edição de conteúdos em vídeo para as redes da marca, com entrega organizada dentro do ciclo mensal contratado.",
    items: [
      { desc: "Vídeos para redes sociais", value: "800", qty: "4" },
      { desc: "Ensaio de fotos dos produtos", value: "1200", qty: "1" },
      { desc: "Planejamento de pauta mensal", value: "600", qty: "1" },
    ],
    showQty: true,
    start: "1 de outubro", payment: "mensal, até o dia 10", revisions: "2 rodadas", validity: "15 dias",
    bio: "Produção de conteúdo para marcas de alimentação desde 2019.", logo: null, theme: "claro",
  },
  recibo: {
    client: "TechNova", company: "Órbita Labs", title: "Plataforma web e painel administrativo",
    scope: "Front-end responsivo em React, integração com a API existente e painel administrativo com controle de permissões. Inclui testes automatizados dos fluxos principais e documentação de deploy.",
    items: [{ desc: "Front-end responsivo", value: "6500" }, { desc: "Integração de API", value: "3200" }, { desc: "Painel administrativo", value: "2800" }],
    start: "1 de setembro", end: "15 de novembro", payment: "3 etapas", revisions: "2 rodadas", validity: "20 dias",
    bio: "Dev full-stack há 10 anos, com foco em produtos SaaS.", logo: null,
  },
  grande: {
    client: "GuaraciabaNet", company: "World Mídia", title: "Gestão de redes sociais e tráfego pago",
    scope: "Gestão completa das redes com produção de conteúdo, gestão de campanhas pagas e relatório mensal de métricas. A operação cobre Instagram, Facebook e Google Ads, com calendário editorial aprovado no início de cada mês.",
    items: [{ desc: "8 artes mensais para redes", value: "600" }, { desc: "Gestão de tráfego pago", value: "500" }, { desc: "4 vídeos ou reels", value: "397" }],
    start: "1 de setembro", end: "30 de setembro", validity: "10 dias", payment: "PIX ou dinheiro", revisions: "2 rodadas",
    bio: "Agência de social media e tráfego, 40 clientes atendidos desde 2019.", logo: null, watermark: "",
  },
  studio: {
    client: "Casa Farol", company: "Oficina Norte", title: "Identidade e direção de arte",
    scope: "Conceito de marca, sistema visual completo e direção de arte para a campanha de abertura, incluindo aplicações em fachada, embalagem e redes.",
    items: [{ desc: "Conceito e direção de arte", value: "4200" }, { desc: "Sistema visual completo", value: "5800" }, { desc: "Campanha de abertura", value: "3400" }],
    start: "3 de setembro", end: "1 de outubro", validity: "15 dias", payment: "50% na aprovação, 50% na entrega", revisions: "2 rodadas",
    bio: "Estúdio de design e direção de arte em Fortaleza.", logo: null, cover: COVER_STUDIO, coverPos: "50,42",
  },
  aurora: {
    client: "Camila Rocha", company: "Camila Nutri", title: "Site e presença digital",
    scope: "Landing page, integração com agendamento online e configuração de SEO básico.",
    items: [{ desc: "Landing page", value: "1800" }, { desc: "Agendamento online", value: "700" }, { desc: "SEO básico", value: "600" }],
    start: "5 de setembro", end: "25 de setembro", validity: "15 dias",
    bio: "Designer e desenvolvedora freelancer.", logo: null,
  },
  poster: {
    client: "Coletivo Maré", company: "Festival Maré", title: "Design para o festival",
    scope: "Identidade do festival, cartazes, artes para redes e material impresso de rua.",
    items: [{ desc: "Identidade do festival", value: "2500" }, { desc: "Artes para redes (mês)", value: "1800" }, { desc: "Material de rua", value: "1400" }],
    start: "5 de agosto", end: "1 de outubro", validity: "15 dias",
    bio: "Designer especializado em cultura e eventos.", logo: null,
  },
};

export const sampleFor = (id) => SAMPLE_BY_ID[id] || SAMPLE_DOC;
