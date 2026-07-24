import { font, color, brl } from "../theme.js";

// Conteúdo de exemplo usado nas miniaturas da galeria.
export const SAMPLE_DOC = {
  client: "Paula Rodrigues", company: "Viana Café", title: "Produção de vídeo institucional",
  scope: "Vídeo institucional de até 90 segundos para o site e as redes. Inclui roteiro, direção, uma diária de gravação e edição com trilha e legendas.",
  items: [{ desc: "Roteiro + direção", value: "1800" }, { desc: "Diária de gravação", value: "2400" }, { desc: "Edição + finalização", value: "1600" }],
  start: "10 de agosto", end: "5 de setembro",
  payment: "50% na aprovação, 50% na entrega", revisions: "2 rodadas", validity: "15 dias",
  bio: "Videomaker há 6 anos, especializado em vídeos para pequenas marcas.", logo: null,
};

// Cada template tem um exemplo próprio (cliente, serviços e valores diferentes),
// pra galeria não mostrar tudo igual. Usados só nas miniaturas.
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
    bio: "Fotógrafo de casamentos há 6 anos.", logo: null, cover: null,
  },
  dossie: {
    client: "Banda Eclipse", company: "Selo Meia-Noite", title: "Produção de videoclipe",
    scope: "Roteiro, direção, uma diária de gravação e finalização com color grading.",
    items: [{ desc: "Roteiro e direção", value: "2500" }, { desc: "Diária de gravação", value: "3500" }, { desc: "Edição e color", value: "2200" }],
    start: "3 de setembro", end: "1 de outubro", validity: "15 dias",
    bio: "Diretor audiovisual e videomaker.", logo: null, cover: null,
  },
  carta: {
    client: "Dr. Henrique Salles", company: "Salles Advocacia", title: "Consultoria jurídica mensal",
    scope: "Assessoria contratual e trabalhista com atendimento prioritário e pareceres.",
    items: [{ desc: "Assessoria mensal", value: "2200" }, { desc: "Análise de contratos", value: "900" }, { desc: "Pareceres (até 3)", value: "1100" }],
    start: "1 de agosto", payment: "Mensal", validity: "30 dias",
    bio: "Consultor com atuação empresarial.", logo: null,
  },
  aurora: {
    client: "Camila Rocha", company: "Camila Nutri", title: "Site e presença digital",
    scope: "Landing page, integração com agendamento online e configuração de SEO básico.",
    items: [{ desc: "Landing page", value: "1800" }, { desc: "Agendamento online", value: "700" }, { desc: "SEO básico", value: "600" }],
    start: "5 de setembro", end: "25 de setembro", validity: "15 dias",
    bio: "Designer e desenvolvedora freelancer.", logo: null,
  },
  studio: {
    client: "TechNova", company: "TechNova SaaS", title: "Desenvolvimento de plataforma web",
    scope: "Front-end responsivo, integração de API e painel administrativo.",
    items: [{ desc: "Front-end", value: "6500" }, { desc: "Integração de API", value: "3200" }, { desc: "Painel administrativo", value: "2800" }],
    start: "1 de setembro", end: "15 de novembro", payment: "3 etapas", validity: "20 dias",
    bio: "Dev full-stack há 10 anos.", logo: null,
  },
  recibo: {
    client: "Zé do Açaí", company: "Açaí do Zé", title: "Combo social media + design",
    scope: "Cardápio novo, 8 artes por mês e gestão do Instagram do delivery.",
    items: [{ desc: "Design de cardápio", value: "450" }, { desc: "8 artes por mês", value: "800" }, { desc: "Gestão do Instagram", value: "650" }],
    start: "1 de setembro", end: "30 de setembro", validity: "7 dias",
    bio: "Designer e social media.", logo: null,
  },
  grande: {
    client: "GuaraciabaNet", company: "World Mídia", title: "Social media completo",
    scope: "Gestão de redes com produção de conteúdo, tráfego pago e relatório mensal de métricas.",
    items: [{ desc: "8 artes mensais", value: "600" }, { desc: "Tráfego pago (gestão)", value: "500" }, { desc: "4 vídeos ou reels", value: "397" }],
    start: "1 de setembro", validity: "10 dias", payment: "PIX ou dinheiro",
    bio: "Agência de social media e tráfego.", logo: null,
  },
  poster: {
    client: "Deputado Silva", company: "Campanha 2026", title: "Design para campanha política",
    scope: "Identidade da campanha, artes para redes, santinhos e material de rua.",
    items: [{ desc: "Identidade da campanha", value: "2500" }, { desc: "Artes para redes (mês)", value: "1800" }, { desc: "Material de rua", value: "1400" }],
    start: "5 de agosto", end: "1 de outubro", validity: "15 dias",
    bio: "Designer especializado em campanhas.", logo: null,
  },
};

export const sampleFor = (id) => SAMPLE_BY_ID[id] || SAMPLE_DOC;

const has = (v) => v != null && String(v).trim() !== "";
// Preenchimento do destaque: sólido, ou gradiente quando o usuário liga a segunda cor.
const accentFill = (doc, accent) => (doc.gradient && has(doc.accent2))
  ? `linear-gradient(135deg, ${accent} 0%, ${doc.accent2} 100%)`
  : accent;

// ── Contraste garantido ──────────────────────────────────────────────────────
// A cor de destaque é livre (o usuário escolhe qualquer uma), então nenhum
// texto pode depender só dela: destaque escuro some em fundo escuro e
// destaque claro some em fundo branco. Luminância aproximada de 0 a 1:
const lum = (hex) => {
  const h = String(hex || "").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (full.length !== 6) return 0;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return 0;
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
};
// Texto na cor de destaque SOBRE FUNDO ESCURO: se a cor for escura, vira branco.
const onDark = (a) => (lum(a) < 0.4 ? "#FFFFFF" : a);
// Texto na cor de destaque SOBRE FUNDO CLARO: se a cor for clara, vira tinta.
const onLight = (a) => (lum(a) > 0.68 ? "#18181B" : a);
// Texto de botões/faixas PINTADOS com a cor de destaque: branco ou tinta.
const btnText = (a) => (lum(a) > 0.68 ? "#18181B" : "#FFFFFF");

const rgbOf = (hex) => {
  const h = String(hex || "").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (full.length !== 6) return null;
  const n = parseInt(full, 16);
  return Number.isNaN(n) ? null : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (r, g, b) => "#" + [r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join("");
// Versão escurecida da cor (mistura em direção ao preto): título legível em fundo claro.
const darken = (hex, f = 0.42) => { const c = rgbOf(hex); return c ? toHex(c[0] * (1 - f), c[1] * (1 - f), c[2] * (1 - f)) : hex; };
// Versão bem clara da cor (mistura com branco): fundo de faixa/realce sutil.
const wash = (hex, f = 0.9) => { const c = rgbOf(hex); return c ? toHex(c[0] + (255 - c[0]) * f, c[1] + (255 - c[1]) * f, c[2] + (255 - c[2]) * f) : hex; };

// ── Tema de fundo (Claro / Creme / Escuro) ──────────────────────────────────
// Controle "seguro": muda a base do template sem quebrar a legibilidade.
// A cor de destaque continua cuidando de título e realces.
const THEMES = {
  claro:  { dark: false, bg: "#FFFFFF", border: "#E7E7EA", ink: "#18181B", sub: "#52525B", soft: "#8A8A90", line: "#EEEEEE", panel: "#F7F7F8" },
  creme:  { dark: false, bg: "#FBF8F2", border: "#E8E1D4", ink: "#241C12", sub: "#4E4433", soft: "#8C7B62", line: "#EDE6D8", panel: "#F4EFE4" },
  escuro: { dark: true,  bg: "#141416", border: "#2A2A2E", ink: "#F4F4F6", sub: "#C4C4CB", soft: "#8E8E96", line: "#2A2A2E", panel: "#1D1D20" },
};
const themeOf = (doc) => THEMES[doc && doc.theme] || THEMES.claro;
// Cor de destaque como TEXTO, legível na base do tema (claro escurece, escuro clareia).
const accentInkFor = (accent, T) => (T.dark ? onDark(accent) : darken(accent, 0.34));
// Faixa/painel tingido na cor, coerente com o tema.
const panelFor = (accent, T) => (T.dark ? darken(accent, 0.72) : wash(accent, 0.9));
const hairFor = (accent, T) => (T.dark ? darken(accent, 0.5) : wash(accent, 0.6));
// Itens ocultos (o dono optou por não cobrar) não aparecem na proposta nem no total.
const filledItems = (doc) => doc.items.filter((it) => !it.hidden && (has(it.desc) || has(it.value)));
const sum = (arr) => arr.reduce((a, it) => a + (parseInt(it.value, 10) || 0), 0);
const money = (v) => brl(parseInt(v, 10) || 0);
const kicker = (c) => ({ fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: c, marginBottom: 8 });

// Torna o texto da prévia clicável para focar o campo no editor. Só age quando
// `onEdit` é passado (modo edição); na proposta do cliente/PDF, é texto normal.
function Ed({ onEdit, field, children }) {
  if (!onEdit) return children;
  return <span className="pd-edit" role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); onEdit(field); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onEdit(field); } }}>{children}</span>;
}

function Mono({ doc, size = 42, radius = 10, bg = color.ink, fg = "#fff" }) {
  if (doc.logo) return <img src={doc.logo} alt="" style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", display: "block", flex: "none" }} />;
  return <span style={{ width: size, height: size, borderRadius: radius, background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.heading, fontWeight: 900, fontSize: size * 0.42, flex: "none" }}>M</span>;
}

/* ---------- 1. MINIMAL ---------- */
function Minimal({ doc, accent, onAccept, onEdit }) {
  const items = filledItems(doc);
  const total = sum(items);
  const dates = [["Início", doc.start], ["Entrega", doc.end]].filter(([, v]) => has(v));
  const T = themeOf(doc);
  const deep = accentInkFor(accent, T);
  const soft = panelFor(accent, T);
  return (
    <div style={{ background: T.bg, color: T.ink, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", boxShadow: "0 12px 40px -16px rgba(20,20,30,0.16)", overflowWrap: "anywhere", wordBreak: "break-word" }}>
      <div style={{ height: 5, background: accent }} />
      <div style={{ padding: "30px 34px 34px" }}>
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
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "11px 14px", borderBottom: i < items.length - 1 ? `1px solid ${T.line}` : "none", fontSize: "13.5px" }}>
                <span style={{ color: T.sub }}><Ed onEdit={onEdit} field="items">{it.desc || "Item"}</Ed></span><span style={{ fontWeight: 600, color: T.ink, fontVariantNumeric: "tabular-nums" }}>{money(it.value)}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, background: soft, borderRadius: 10, padding: "12px 14px" }}>
            <span style={{ fontSize: 13, color: deep, fontWeight: 600 }}>Total</span>
            <span style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 24, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: deep }}>{brl(total)}</span>
          </div>
        </>)}

        {dates.length > 0 && (
          <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
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

        <button onClick={onAccept} style={{ width: "100%", fontFamily: font.body, fontSize: 15, fontWeight: 600, color: btnText(accent), background: accent, border: "none", padding: 13, borderRadius: 10, cursor: "pointer" }}>Aceitar proposta</button>
      </div>
    </div>
  );
}

/* ---------- 2. BOLD ---------- */
function Bold({ doc, accent, onAccept, onEdit }) {
  const items = filledItems(doc);
  const total = sum(items);
  const chips = [["Início", doc.start], ["Entrega", doc.end], ["Validade", doc.validity]].filter(([, v]) => has(v));
  const T = themeOf(doc);
  return (
    <div style={{ background: T.bg, color: T.ink, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 12px 40px -16px rgba(20,20,30,0.16)", overflowWrap: "anywhere", wordBreak: "break-word" }}>
      <div style={{ background: accentFill(doc, accent), color: btnText(accent), padding: "26px 30px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <Mono doc={doc} size={34} radius={9} bg="rgba(255,255,255,0.18)" />
          <div style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.85 }}>Proposta</div>
        </div>
        <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", opacity: 0.85, marginBottom: 8 }}>Para <Ed onEdit={onEdit} field="client">{doc.client || "cliente"}</Ed>{has(doc.company) ? ` · ${doc.company}` : ""}</div>
        <div style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 30, lineHeight: 1.02, letterSpacing: "-0.03em" }}><Ed onEdit={onEdit} field="title">{doc.title || "Título da proposta"}</Ed></div>
      </div>
      <div style={{ padding: "24px 30px 30px" }}>
        {has(doc.scope) && <p style={{ fontSize: 14, lineHeight: 1.6, color: T.sub, margin: "0 0 22px" }}><Ed onEdit={onEdit} field="scope">{doc.scope}</Ed></p>}
        {items.length > 0 && (<>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 18 }}>
            {items.map((it, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px dashed ${T.line}`, fontSize: 14 }}>
                <span style={{ color: T.sub }}><Ed onEdit={onEdit} field="items">{it.desc || "Item"}</Ed></span><span style={{ fontWeight: 700, color: T.ink, fontVariantNumeric: "tabular-nums" }}>{money(it.value)}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 22 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.sub }}>Total</span>
            <span style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 34, letterSpacing: "-0.03em", color: accentInkFor(accent, T), fontVariantNumeric: "tabular-nums" }}>{brl(total)}</span>
          </div>
        </>)}
        {chips.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
            {chips.map(([k, v]) => (
              <span key={k} style={{ fontSize: "12.5px", color: T.sub, background: T.panel, borderRadius: 8, padding: "6px 10px" }}><b style={{ color: T.soft, fontWeight: 600 }}>{k}:</b> {v}</span>
            ))}
          </div>
        )}
        {has(doc.bio) && (
          <div style={{ marginBottom: 22, paddingTop: 18, borderTop: `1px solid ${T.line}` }}>
            <div style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.soft, marginBottom: 6 }}>Sobre mim</div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: T.sub, margin: 0 }}><Ed onEdit={onEdit} field="bio">{doc.bio}</Ed></p>
          </div>
        )}
        <button onClick={onAccept} style={{ width: "100%", fontFamily: font.body, fontSize: 15, fontWeight: 700, color: btnText(accent), background: accent, border: "none", padding: 14, borderRadius: 10, cursor: "pointer" }}>Aceitar proposta</button>
      </div>
    </div>
  );
}

/* ---------- 3. EDITORIAL ---------- */
function Editorial({ doc, accent, onAccept, onEdit }) {
  const items = filledItems(doc);
  const total = sum(items);
  const meta = [["Cliente", doc.client || "Cliente"], ["Início", doc.start], ["Entrega", doc.end]].filter(([k, v]) => k === "Cliente" || has(v));
  const conds = [["Pagamento", doc.payment], ["Revisões", doc.revisions]].filter(([, v]) => has(v));
  const T = themeOf(doc);
  const deep = accentInkFor(accent, T);
  const soft = panelFor(accent, T);
  const rule = { height: 1, background: accent, opacity: 0.28 };
  return (
    <div style={{ background: T.bg, color: T.ink, border: `1px solid ${T.border}`, borderRadius: 6, overflow: "hidden", overflowWrap: "anywhere", wordBreak: "break-word" }}>
      <div style={{ background: soft, padding: "24px 32px 22px", borderBottom: `1px solid ${hairFor(accent, T)}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Mono doc={doc} size={30} radius={7} bg={deep} fg={btnText(deep)} />
          <span style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em", color: deep }}>{doc.company || "Seu estúdio"}</span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: deep }}>Proposta</div>
          {has(doc.validity) && <div style={{ fontSize: 12, color: T.sub }}>Válida por {doc.validity}</div>}
        </div>
      </div>
      <h2 style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 27, lineHeight: 1.12, letterSpacing: "-0.02em", margin: "16px 0 0", color: doc.title ? deep : T.soft }}><Ed onEdit={onEdit} field="title">{doc.title || "Título da proposta"}</Ed></h2>
      </div>
      <div style={{ padding: "22px 32px 32px" }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${meta.length}, 1fr)`, gap: 14, marginBottom: 20 }}>
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
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${T.line}`, fontSize: "13.5px" }}>
            <span style={{ color: T.sub }}><Ed onEdit={onEdit} field="items">{it.desc || "Item"}</Ed></span><span style={{ fontWeight: 600, color: T.ink, fontVariantNumeric: "tabular-nums" }}>{money(it.value)}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "12px 14px", marginTop: 8, background: soft, borderRadius: 8 }}>
          <span style={{ fontSize: "10.5px", letterSpacing: "0.08em", textTransform: "uppercase", color: deep }}>Total</span>
          <span style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: deep }}>{brl(total)}</span>
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
      <button onClick={onAccept} style={{ marginTop: 20, width: "100%", fontFamily: font.body, fontSize: 14.5, fontWeight: 600, color: btnText(accent), background: accent, border: "none", padding: 13, borderRadius: 8, cursor: "pointer" }}>Aceitar proposta</button>
      </div>
    </div>
  );
}

/* ---------- 4. COLORIDO ---------- */
function Colorido({ doc, accent, onAccept, onEdit }) {
  const items = filledItems(doc);
  const total = sum(items);
  const dates = [["Início", doc.start], ["Entrega", doc.end]].filter(([, v]) => has(v));
  const T = themeOf(doc);
  const deep = accentInkFor(accent, T);
  const soft = panelFor(accent, T);
  const headBg = (doc.gradient && has(doc.accent2))
    ? `linear-gradient(135deg, ${accent} 0%, ${doc.accent2} 100%)`
    : `radial-gradient(120% 130% at 85% -10%, ${accent} 0%, ${accent}CC 55%, ${accent}99 100%)`;
  return (
    <div style={{ background: T.bg, color: T.ink, border: `1px solid ${T.border}`, borderRadius: 18, overflow: "hidden", boxShadow: "0 16px 44px -18px rgba(20,20,30,0.28)", overflowWrap: "anywhere", wordBreak: "break-word" }}>
      <div style={{ background: headBg, color: btnText(accent), padding: "30px 30px 34px" }}>
        <Mono doc={doc} size={44} radius={12} bg="rgba(255,255,255,0.22)" />
        <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", opacity: 0.9, margin: "22px 0 6px" }}>Proposta para <Ed onEdit={onEdit} field="client">{doc.client || "cliente"}</Ed></div>
        <div style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 28, lineHeight: 1.04, letterSpacing: "-0.03em" }}><Ed onEdit={onEdit} field="title">{doc.title || "Título da proposta"}</Ed></div>
      </div>
      <div style={{ padding: "24px 30px 30px" }}>
        {has(doc.scope) && <p style={{ fontSize: 14, lineHeight: 1.6, color: T.sub, margin: "0 0 22px" }}><Ed onEdit={onEdit} field="scope">{doc.scope}</Ed></p>}
        {items.length > 0 && (
          <div style={{ background: soft, borderRadius: 14, padding: "16px 18px", marginBottom: 20 }}>
            {items.map((it, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < items.length - 1 ? `1px solid ${hairFor(accent, T)}` : "none", fontSize: "13.5px" }}>
                <span style={{ color: T.sub }}><Ed onEdit={onEdit} field="items">{it.desc || "Item"}</Ed></span><span style={{ fontWeight: 600, color: T.ink, fontVariantNumeric: "tabular-nums" }}>{money(it.value)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 12, marginTop: 6, borderTop: `1px solid ${hairFor(accent, T)}` }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: deep }}>Total</span>
              <span style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 24, letterSpacing: "-0.02em", color: deep, fontVariantNumeric: "tabular-nums" }}>{brl(total)}</span>
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
        <button onClick={onAccept} style={{ width: "100%", fontFamily: font.body, fontSize: 15, fontWeight: 700, color: btnText(accent), background: accent, border: "none", padding: 14, borderRadius: 12, cursor: "pointer" }}>Aceitar proposta</button>
      </div>
    </div>
  );
}

/* ---------- 5. CAPA (com foto) ---------- */
function Capa({ doc, accent, onAccept, onEdit }) {
  const items = filledItems(doc);
  const total = sum(items);
  const dates = [["Início", doc.start], ["Entrega", doc.end]].filter(([, v]) => has(v));
  const T = themeOf(doc);
  const deep = accentInkFor(accent, T);
  const hero = doc.cover
    ? { backgroundImage: `url(${doc.cover})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: `linear-gradient(135deg, ${accent} 0%, ${accent}B3 100%)` };
  return (
    <div style={{ background: T.bg, color: T.ink, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 12px 40px -16px rgba(20,20,30,0.16)", overflowWrap: "anywhere", wordBreak: "break-word" }}>
      <div style={{ position: "relative", height: 200, ...hero }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.6) 100%)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "22px 24px", color: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
            {doc.logo
              ? <img src={doc.logo} alt="" style={{ width: 30, height: 30, borderRadius: 8, objectFit: "cover", display: "block" }} />
              : <span style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.heading, fontWeight: 900, fontSize: 14 }}>M</span>}
            <span style={{ fontSize: "12.5px", fontWeight: 500, opacity: 0.92 }}>Proposta para <Ed onEdit={onEdit} field="client">{doc.client || "cliente"}</Ed>{has(doc.company) ? ` · ${doc.company}` : ""}</span>
          </div>
          <div style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 25, lineHeight: 1.05, letterSpacing: "-0.02em", textShadow: "0 2px 12px rgba(0,0,0,0.35)" }}><Ed onEdit={onEdit} field="title">{doc.title || "Título da proposta"}</Ed></div>
        </div>
      </div>
      <div style={{ padding: "24px 26px 26px" }}>
        {has(doc.scope) && (<>
          <div style={kicker(deep)}>Escopo</div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: T.sub, margin: "0 0 22px" }}><Ed onEdit={onEdit} field="scope">{doc.scope}</Ed></p>
        </>)}
        {items.length > 0 && (<>
          <div style={kicker(deep)}>Investimento</div>
          <div style={{ border: `1px solid ${hairFor(accent, T)}`, borderRadius: 11, overflow: "hidden", marginBottom: 12 }}>
            {items.map((it, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "11px 14px", borderBottom: i < items.length - 1 ? `1px solid ${T.line}` : "none", fontSize: "13.5px" }}>
                <span style={{ color: T.sub }}><Ed onEdit={onEdit} field="items">{it.desc || "Item"}</Ed></span><span style={{ fontWeight: 600, color: T.ink, fontVariantNumeric: "tabular-nums" }}>{money(it.value)}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, background: panelFor(accent, T), borderRadius: 10, padding: "12px 14px" }}>
            <span style={{ fontSize: 13, color: deep, fontWeight: 600 }}>Total</span>
            <span style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 24, letterSpacing: "-0.02em", color: deep, fontVariantNumeric: "tabular-nums" }}>{brl(total)}</span>
          </div>
        </>)}
        {dates.length > 0 && (
          <div style={{ display: "flex", gap: 24, marginBottom: 22 }}>
            {dates.map(([k, v]) => (<div key={k}><div style={{ fontSize: "11.5px", color: T.soft, marginBottom: 3 }}>{k}</div><div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{v}</div></div>))}
          </div>
        )}
        {has(doc.bio) && (
          <div style={{ marginBottom: 22 }}>
            <div style={kicker(T.soft)}>Sobre mim</div>
            <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: T.sub, margin: 0 }}><Ed onEdit={onEdit} field="bio">{doc.bio}</Ed></p>
          </div>
        )}
        <button onClick={onAccept} style={{ width: "100%", fontFamily: font.body, fontSize: 15, fontWeight: 600, color: btnText(accent), background: accent, border: "none", padding: 14, borderRadius: 11, cursor: "pointer" }}>Aceitar proposta</button>
      </div>
    </div>
  );
}

/* ---------- 6. DOSSIÊ (foto escura) ---------- */
function Dossie({ doc, accent, onAccept, onEdit }) {
  const items = filledItems(doc);
  const total = sum(items);
  const chips = [["Início", doc.start], ["Entrega", doc.end], ["Validade", doc.validity]].filter(([, v]) => has(v));
  const hero = doc.cover
    ? { backgroundImage: `url(${doc.cover})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: `linear-gradient(155deg, ${darken(accent, 0.6)} 0%, #0C0C0C 100%)` };
  return (
    <div style={{ background: "#0E0E0E", color: "#fff", border: "1px solid #1E1E1E", borderRadius: 16, overflow: "hidden", boxShadow: "0 16px 44px -18px rgba(0,0,0,0.5)", overflowWrap: "anywhere", wordBreak: "break-word" }}>
      <div style={{ position: "relative", height: 224, ...hero }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(14,14,14,0.96) 100%)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "26px 26px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: onDark(accent), marginBottom: 10 }}>Proposta · <Ed onEdit={onEdit} field="client">{doc.client || "cliente"}</Ed></div>
          <div style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 27, lineHeight: 1.02, letterSpacing: "-0.01em", textTransform: "uppercase" }}><Ed onEdit={onEdit} field="title">{doc.title || "Título da proposta"}</Ed></div>
        </div>
      </div>
      <div style={{ padding: "24px 26px 28px" }}>
        {has(doc.scope) && <p style={{ fontSize: 14, lineHeight: 1.65, color: "#C9C9CE", margin: "0 0 22px" }}><Ed onEdit={onEdit} field="scope">{doc.scope}</Ed></p>}
        {items.length > 0 && (<>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 18 }}>
            {items.map((it, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid #222", fontSize: 14 }}>
                <span style={{ color: "#D4D4D8" }}><Ed onEdit={onEdit} field="items">{it.desc || "Item"}</Ed></span><span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{money(it.value)}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 22, background: darken(accent, 0.72), border: `1px solid ${darken(accent, 0.5)}`, borderRadius: 10, padding: "12px 15px" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#B9B9C0" }}>Total</span>
            <span style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 32, letterSpacing: "-0.03em", color: onDark(accent), fontVariantNumeric: "tabular-nums" }}>{brl(total)}</span>
          </div>
        </>)}
        {chips.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
            {chips.map(([k, v]) => (<span key={k} style={{ fontSize: "12.5px", color: "#D4D4D8", background: "#1A1A1A", border: "1px solid #262626", borderRadius: 8, padding: "6px 10px" }}><b style={{ color: "#8A8A90", fontWeight: 600 }}>{k}:</b> {v}</span>))}
          </div>
        )}
        {has(doc.bio) && (
          <div style={{ marginBottom: 22, paddingTop: 18, borderTop: "1px solid #222" }}>
            <div style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8A8A90", marginBottom: 6 }}>Sobre mim</div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "#B4B4BA", margin: 0 }}><Ed onEdit={onEdit} field="bio">{doc.bio}</Ed></p>
          </div>
        )}
        <button onClick={onAccept} style={{ width: "100%", fontFamily: font.body, fontSize: 15, fontWeight: 700, color: btnText(accent), background: accent, border: "none", padding: 14, borderRadius: 11, cursor: "pointer" }}>Aceitar proposta</button>
      </div>
    </div>
  );
}

/* ---------- 7. CARTA (papel elegante, serifa) ---------- */
const serif = "Georgia, 'Times New Roman', serif";
function Carta({ doc, accent, onAccept, onEdit }) {
  const items = filledItems(doc);
  const total = sum(items);
  const meta = [["Início", doc.start], ["Entrega", doc.end], ["Validade", doc.validity]].filter(([, v]) => has(v));
  const conds = [["Pagamento", doc.payment], ["Revisões", doc.revisions]].filter(([, v]) => has(v));
  const T = themeOf(doc);
  const deep = accentInkFor(accent, T);
  const soft = panelFor(accent, T);
  const line = hairFor(accent, T);
  return (
    <div style={{ background: T.bg, color: T.ink, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden", overflowWrap: "anywhere", wordBreak: "break-word", boxShadow: "0 12px 40px -18px rgba(60,45,20,0.18)" }}>
      {/* cabeçalho com faixa tingida na cor escolhida */}
      <div style={{ background: soft, borderBottom: `1px solid ${line}`, padding: "30px 38px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <Mono doc={doc} size={44} radius={22} bg={deep} fg={btnText(deep)} />
        <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: deep, margin: "14px 0 4px" }}>{doc.company || "Proposta comercial"}</div>
        <div style={{ width: 46, borderTop: `2px solid ${accent}`, margin: "10px 0 0" }} />
      </div>
      <div style={{ padding: "26px 38px 34px" }}>
      <h2 style={{ fontFamily: serif, fontWeight: 700, fontSize: 27, lineHeight: 1.18, letterSpacing: "-0.01em", textAlign: "center", margin: "0 0 8px", color: doc.title ? deep : T.soft }}><Ed onEdit={onEdit} field="title">{doc.title || "Título da proposta"}</Ed></h2>
      <div style={{ fontFamily: serif, fontStyle: "italic", fontSize: "14.5px", color: T.sub, textAlign: "center", marginBottom: 24 }}>preparada para {doc.client || "seu cliente"}</div>

      {has(doc.scope) && (
        <p style={{ fontFamily: serif, fontSize: "14.5px", lineHeight: 1.75, color: T.sub, margin: "0 0 24px" }}><Ed onEdit={onEdit} field="scope">{doc.scope}</Ed></p>
      )}

      {items.length > 0 && (<>
        <div style={{ borderTop: `1px solid ${line}`, borderBottom: `1px solid ${line}`, padding: "6px 0", marginBottom: 14 }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "9px 2px", borderBottom: i < items.length - 1 ? `1px dotted ${line}` : "none", fontSize: "13.5px" }}>
              <span style={{ fontFamily: serif, color: T.sub }}><Ed onEdit={onEdit} field="items">{it.desc || "Item"}</Ed></span>
              <span style={{ fontFamily: serif, fontWeight: 700, color: T.ink, fontVariantNumeric: "tabular-nums" }}>{money(it.value)}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24, background: soft, borderRadius: 8, padding: "12px 14px" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: deep }}>Investimento total</span>
          <span style={{ fontFamily: serif, fontWeight: 700, fontSize: 26, color: deep, fontVariantNumeric: "tabular-nums" }}>{brl(total)}</span>
        </div>
      </>)}

      {meta.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 26, marginBottom: 22, flexWrap: "wrap" }}>
          {meta.map(([k, v]) => (
            <div key={k} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: T.soft, marginBottom: 3 }}>{k}</div>
              <div style={{ fontFamily: serif, fontSize: "13.5px", fontWeight: 700, color: T.sub }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {conds.length > 0 && (
        <div style={{ fontFamily: serif, fontSize: "12.5px", fontStyle: "italic", color: T.sub, textAlign: "center", lineHeight: 1.7, marginBottom: 20 }}>
          {conds.map(([k, v]) => <div key={k}>{k}: {v}</div>)}
        </div>
      )}

      {has(doc.bio) && (
        <div style={{ borderTop: `1px solid ${line}`, paddingTop: 16, marginBottom: 22 }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: deep, textAlign: "center", marginBottom: 7 }}>Sobre mim</div>
          <p style={{ fontFamily: serif, fontSize: "13px", lineHeight: 1.7, color: T.sub, textAlign: "center", margin: 0 }}><Ed onEdit={onEdit} field="bio">{doc.bio}</Ed></p>
        </div>
      )}

      <button onClick={onAccept} style={{ width: "100%", fontFamily: font.body, fontSize: 14.5, fontWeight: 600, color: btnText(accent), background: accent, border: "none", padding: 13, borderRadius: 8, cursor: "pointer", letterSpacing: "0.02em" }}>Aceitar proposta</button>
      </div>
    </div>
  );
}

/* ---------- 8. RECIBO (cupom criativo, monospace) ---------- */
const monosp = "'Courier New', ui-monospace, monospace";
function Recibo({ doc, accent, onAccept, onEdit }) {
  const items = filledItems(doc);
  const total = sum(items);
  const meta = [["INICIO", doc.start], ["ENTREGA", doc.end], ["VALIDADE", doc.validity]].filter(([, v]) => has(v));
  const T = themeOf(doc);
  const deep = accentInkFor(accent, T);
  const dash = hairFor(accent, T);
  const line = <div style={{ borderTop: `2px dashed ${dash}`, margin: "16px 0" }} />;
  return (
    <div style={{ position: "relative", background: T.bg, color: T.ink, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", overflowWrap: "anywhere", wordBreak: "break-word", boxShadow: "0 12px 40px -16px rgba(20,20,30,0.16)", fontFamily: monosp }}>
      <div style={{ height: 6, background: accent }} />
      <div style={{ padding: "22px 26px 26px", position: "relative" }}>
      <div style={{ position: "absolute", top: 14, right: 16, transform: "rotate(8deg)", border: `2px solid ${deep}`, color: deep, borderRadius: 6, fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", padding: "4px 8px" }}>PROPOSTA</div>
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <Mono doc={doc} size={40} radius={20} bg={deep} fg={btnText(deep)} />
      </div>
      <div style={{ textAlign: "center", fontSize: "13px", fontWeight: 700, letterSpacing: "0.06em", marginBottom: 2, color: deep }}>{(doc.company || "SEU ESTÚDIO").toUpperCase()}</div>
      <div style={{ textAlign: "center", fontSize: "11.5px", color: T.sub }}>para <Ed onEdit={onEdit} field="client">{doc.client || "cliente"}</Ed></div>
      {line}
      <div style={{ fontSize: "15px", fontWeight: 700, lineHeight: 1.35, textAlign: "center", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.02em", color: doc.title ? deep : T.soft }}><Ed onEdit={onEdit} field="title">{doc.title || "Título da proposta"}</Ed></div>
      {has(doc.scope) && <p style={{ fontSize: "12px", lineHeight: 1.65, color: T.sub, margin: "12px 0 0" }}><Ed onEdit={onEdit} field="scope">{doc.scope}</Ed></p>}
      {line}
      {items.length > 0 && (<>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 6, padding: "5px 0", fontSize: "12.5px" }}>
            <span style={{ color: T.sub, flex: "none", maxWidth: "62%" }}>{(it.desc || "Item").toUpperCase()}</span>
            <span style={{ flex: 1, borderBottom: `1.5px dotted ${dash}`, transform: "translateY(-3px)" }} />
            <span style={{ fontWeight: 700, color: T.ink, fontVariantNumeric: "tabular-nums" }}>{money(it.value)}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 12, paddingTop: 12, borderTop: `2px solid ${accent}` }}>
          <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", color: deep }}>TOTAL</span>
          <span style={{ fontSize: "22px", fontWeight: 700, color: deep, fontVariantNumeric: "tabular-nums" }}>{brl(total)}</span>
        </div>
      </>)}
      {meta.length > 0 && (<>
        {line}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          {meta.map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: "9.5px", letterSpacing: "0.1em", color: T.soft, marginBottom: 2 }}>{k}</div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: T.ink }}>{v}</div>
            </div>
          ))}
        </div>
      </>)}
      {has(doc.bio) && (<>
        {line}
        <p style={{ fontSize: "11.5px", lineHeight: 1.65, color: T.sub, margin: 0, textAlign: "center" }}><Ed onEdit={onEdit} field="bio">{doc.bio}</Ed></p>
      </>)}
      {line}
      <button onClick={onAccept} style={{ width: "100%", fontFamily: monosp, fontSize: 14, fontWeight: 700, letterSpacing: "0.06em", color: btnText(accent), background: accent, border: "none", padding: 13, borderRadius: 8, cursor: "pointer" }}>ACEITAR PROPOSTA</button>
      <div style={{ textAlign: "center", fontSize: "10px", letterSpacing: "0.14em", color: T.soft, marginTop: 12 }}>* OBRIGADO PELA PREFERÊNCIA *</div>
      </div>
    </div>
  );
}

/* ---------- 9. AURORA (suave, gradiente) ---------- */
function Aurora({ doc, accent, onAccept, onEdit }) {
  const items = filledItems(doc);
  const total = sum(items);
  const dates = [["Início", doc.start], ["Entrega", doc.end], ["Validade", doc.validity]].filter(([, v]) => has(v));
  const a2 = (doc.gradient && has(doc.accent2)) ? doc.accent2 : accent;
  const T = themeOf(doc);
  const deep = accentInkFor(accent, T);
  const glass = T.dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.72)";
  return (
    <div style={{ position: "relative", background: `linear-gradient(165deg, ${accent}22 0%, ${T.bg} 42%, ${a2}18 100%)`, color: T.ink, border: `1px solid ${T.border}`, borderRadius: 22, padding: "30px 30px 28px", overflow: "hidden", overflowWrap: "anywhere", wordBreak: "break-word", boxShadow: "0 16px 48px -20px rgba(20,20,30,0.22)" }}>
      <div style={{ position: "absolute", top: -70, right: -70, width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle, ${a2}33 0%, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <Mono doc={doc} size={40} radius={13} bg={deep} fg={btnText(deep)} />
        <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: btnText(accent), background: accentFill(doc, accent), borderRadius: 999, padding: "6px 12px" }}>Proposta</span>
      </div>
      <div style={{ fontSize: "12.5px", fontWeight: 500, color: T.sub, marginBottom: 6 }}>Para <Ed onEdit={onEdit} field="client">{doc.client || "cliente"}</Ed>{has(doc.company) ? ` · ${doc.company}` : ""}</div>
      <h2 style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 26, lineHeight: 1.08, letterSpacing: "-0.03em", margin: "0 0 18px", color: doc.title ? deep : T.soft }}><Ed onEdit={onEdit} field="title">{doc.title || "Título da proposta"}</Ed></h2>
      {has(doc.scope) && <p style={{ fontSize: 14, lineHeight: 1.65, color: T.sub, margin: "0 0 20px" }}><Ed onEdit={onEdit} field="scope">{doc.scope}</Ed></p>}
      {items.length > 0 && (
        <div style={{ background: glass, backdropFilter: "blur(6px)", border: `1px solid ${hairFor(accent, T)}`, borderRadius: 16, padding: "16px 18px", marginBottom: 18, boxShadow: "0 8px 24px -14px rgba(20,20,30,0.18)" }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < items.length - 1 ? `1px solid ${T.line}` : "none", fontSize: "13.5px" }}>
              <span style={{ color: T.sub }}><Ed onEdit={onEdit} field="items">{it.desc || "Item"}</Ed></span><span style={{ fontWeight: 600, color: T.ink, fontVariantNumeric: "tabular-nums" }}>{money(it.value)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 12, marginTop: 6, borderTop: `1px solid ${T.line}` }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: deep }}>Total</span>
            <span style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 25, letterSpacing: "-0.02em", color: deep, fontVariantNumeric: "tabular-nums" }}>{brl(total)}</span>
          </div>
        </div>
      )}
      {dates.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {dates.map(([k, v]) => (
            <span key={k} style={{ fontSize: "12.5px", color: T.sub, background: glass, border: `1px solid ${T.line}`, borderRadius: 999, padding: "6px 12px" }}><b style={{ color: T.soft, fontWeight: 600 }}>{k}:</b> {v}</span>
          ))}
        </div>
      )}
      {has(doc.bio) && (
        <div style={{ marginBottom: 20 }}>
          <div style={kicker(T.soft)}>Sobre mim</div>
          <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: T.sub, margin: 0 }}><Ed onEdit={onEdit} field="bio">{doc.bio}</Ed></p>
        </div>
      )}
      <button onClick={onAccept} style={{ width: "100%", fontFamily: font.body, fontSize: 15, fontWeight: 700, color: btnText(accent), background: accentFill(doc, accent), border: "none", padding: 14, borderRadius: 14, cursor: "pointer", boxShadow: `0 10px 24px -10px ${accent}80` }}>Aceitar proposta</button>
    </div>
  );
}

/* ---------- 10. STUDIO (duas colunas, lateral escura) ---------- */
function Studio({ doc, accent, onAccept, onEdit }) {
  const items = filledItems(doc);
  const total = sum(items);
  const meta = [["Início", doc.start], ["Entrega", doc.end], ["Validade", doc.validity], ["Pagamento", doc.payment]].filter(([, v]) => has(v));
  const T = themeOf(doc);
  const deep = accentInkFor(accent, T);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "168px 1fr", background: T.bg, color: T.ink, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 14px 44px -18px rgba(20,20,30,0.25)", overflowWrap: "anywhere", wordBreak: "break-word" }}>
      <div style={{ background: `linear-gradient(165deg, ${darken(accent, 0.55)} 0%, ${darken(accent, 0.82)} 100%)`, color: "#fff", padding: "24px 18px", display: "flex", flexDirection: "column", gap: 18 }}>
        <Mono doc={doc} size={38} radius={10} bg="rgba(255,255,255,0.14)" />
        <div>
          <div style={{ fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: onDark(accent), marginBottom: 5 }}>Proposta para</div>
          <div style={{ fontSize: "13.5px", fontWeight: 700, lineHeight: 1.3 }}><Ed onEdit={onEdit} field="client">{doc.client || "Cliente"}</Ed></div>
          {has(doc.company) && <div style={{ fontSize: "11.5px", color: "#9A9AA0", marginTop: 2 }}>{doc.company}</div>}
        </div>
        {meta.map(([k, v]) => (
          <div key={k}>
            <div style={{ fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#77777D", marginBottom: 3 }}>{k}</div>
            <div style={{ fontSize: "12px", fontWeight: 600, lineHeight: 1.35, color: "#E4E4E7" }}>{v}</div>
          </div>
        ))}
        {items.length > 0 && (
          <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid #26262A" }}>
            <div style={{ fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#77777D", marginBottom: 4 }}>Total</div>
            <div style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 21, letterSpacing: "-0.02em", color: onDark(accent), fontVariantNumeric: "tabular-nums" }}>{brl(total)}</div>
          </div>
        )}
      </div>
      <div style={{ padding: "26px 26px 24px", minWidth: 0 }}>
        <h2 style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 24, lineHeight: 1.1, letterSpacing: "-0.03em", margin: "0 0 16px", color: doc.title ? deep : T.soft }}><Ed onEdit={onEdit} field="title">{doc.title || "Título da proposta"}</Ed></h2>
        {has(doc.scope) && (<>
          <div style={kicker(deep)}>Escopo</div>
          <p style={{ fontSize: "13.5px", lineHeight: 1.65, color: T.sub, margin: "0 0 20px" }}><Ed onEdit={onEdit} field="scope">{doc.scope}</Ed></p>
        </>)}
        {items.length > 0 && (<>
          <div style={kicker(T.soft)}>Investimento</div>
          <div style={{ marginBottom: 20 }}>
            {items.map((it, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: i < items.length - 1 ? `1px solid ${T.line}` : "none", fontSize: "13.5px" }}>
                <span style={{ color: T.sub }}><Ed onEdit={onEdit} field="items">{it.desc || "Item"}</Ed></span>
                <span style={{ fontWeight: 700, color: T.ink, fontVariantNumeric: "tabular-nums" }}>{money(it.value)}</span>
              </div>
            ))}
          </div>
        </>)}
        {has(doc.bio) && (
          <div style={{ marginBottom: 20 }}>
            <div style={kicker(T.soft)}>Sobre mim</div>
            <p style={{ fontSize: "13px", lineHeight: 1.6, color: T.sub, margin: 0 }}><Ed onEdit={onEdit} field="bio">{doc.bio}</Ed></p>
          </div>
        )}
        <button onClick={onAccept} style={{ width: "100%", fontFamily: font.body, fontSize: 14.5, fontWeight: 700, color: btnText(accent), background: accent, border: "none", padding: 13, borderRadius: 10, cursor: "pointer" }}>Aceitar proposta</button>
      </div>
    </div>
  );
}

/* ---------- 11. GRANDE (estilo orçamento com marca d'água) ---------- */
function Grande({ doc, accent, onAccept, onEdit }) {
  const items = filledItems(doc);
  const total = sum(items);
  const T = themeOf(doc);
  const deep = accentInkFor(accent, T);
  const meta = [["Início", doc.start], ["Entrega", doc.end], ["Validade", doc.validity]].filter(([, v]) => has(v));
  const conds = [["Pagamento", doc.payment], ["Revisões", doc.revisions]].filter(([, v]) => has(v));
  // Marca d'água: "off" = nenhuma; uma letra = usa ela; "" = inicial automática.
  const wm = doc.watermark === "off"
    ? ""
    : (has(doc.watermark) ? String(doc.watermark).trim().charAt(0).toUpperCase()
      : ((doc.company || doc.client || "M").trim().charAt(0) || "M").toUpperCase());
  return (
    <div style={{ position: "relative", background: T.bg, color: T.ink, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", boxShadow: "0 14px 44px -18px rgba(20,20,30,0.22)", overflowWrap: "anywhere", wordBreak: "break-word" }}>
      {wm && <div aria-hidden="true" style={{ position: "absolute", right: "-4%", top: "2%", fontFamily: font.heading, fontWeight: 900, fontSize: 320, lineHeight: 0.8, color: T.dark ? "rgba(255,255,255,0.05)" : "rgba(20,20,30,0.05)", pointerEvents: "none", userSelect: "none" }}>{wm}</div>}
      <div style={{ height: 5, background: accent }} />
      <div style={{ position: "relative", padding: "30px 34px 34px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <Mono doc={doc} size={40} bg={deep} fg={btnText(deep)} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: deep }}>Orçamento</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{doc.company || "Seu estúdio"}</div>
          </div>
        </div>
        <h2 style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 34, lineHeight: 1.0, letterSpacing: "-0.03em", textTransform: "uppercase", margin: "0 0 6px", color: doc.title ? T.ink : T.soft }}><Ed onEdit={onEdit} field="title">{doc.title || "Título da proposta"}</Ed></h2>
        <div style={{ fontSize: "12.5px", color: T.sub, marginBottom: 24 }}>preparado para <Ed onEdit={onEdit} field="client">{doc.client || "seu cliente"}</Ed></div>

        {has(doc.scope) && (<>
          <div style={{ ...kicker(deep), fontSize: "11px" }}>Descrição do serviço</div>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: T.sub, margin: "0 0 22px" }}><Ed onEdit={onEdit} field="scope">{doc.scope}</Ed></p>
        </>)}

        {items.length > 0 && (<>
          {!has(doc.scope) && <div style={{ ...kicker(deep), fontSize: "11px" }}>Descrição do serviço</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 11, marginBottom: 22 }}>
            {items.map((it, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 14, borderBottom: i < items.length - 1 ? `1px solid ${T.line}` : "none", paddingBottom: 9 }}>
                <span style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 16, letterSpacing: "-0.01em", color: T.ink }}><Ed onEdit={onEdit} field="items">{it.desc || "Item"}</Ed></span>
                <span style={{ fontWeight: 700, color: T.sub, fontVariantNumeric: "tabular-nums", flex: "none" }}>{money(it.value)}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: `2px solid ${accent}`, paddingTop: 14, marginBottom: 22, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: deep }}>Valor de investimento</span>
            <span style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 32, letterSpacing: "-0.02em", color: deep, fontVariantNumeric: "tabular-nums" }}>{brl(total)}</span>
          </div>
        </>)}

        {(meta.length > 0 || conds.length > 0) && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
            {[...meta, ...conds].map(([k, v]) => (
              <span key={k} style={{ fontSize: "12.5px", color: T.sub, background: T.panel, borderRadius: 8, padding: "6px 11px" }}><b style={{ color: T.soft, fontWeight: 600 }}>{k}:</b> {v}</span>
            ))}
          </div>
        )}

        {has(doc.bio) && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ ...kicker(T.soft), fontSize: "11px" }}>Sobre mim</div>
            <p style={{ fontSize: "13px", lineHeight: 1.6, color: T.sub, margin: 0 }}><Ed onEdit={onEdit} field="bio">{doc.bio}</Ed></p>
          </div>
        )}

        <button onClick={onAccept} style={{ width: "100%", fontFamily: font.body, fontSize: 15, fontWeight: 700, color: btnText(accent), background: accent, border: "none", padding: 14, borderRadius: 10, cursor: "pointer" }}>Aceitar proposta</button>
      </div>
    </div>
  );
}

/* ---------- 12. PÔSTER (capa de impacto com pílula) ---------- */
function Poster({ doc, accent, onAccept, onEdit }) {
  const items = filledItems(doc);
  const total = sum(items);
  const T = themeOf(doc);
  const deep = accentInkFor(accent, T);
  const dates = [["Início", doc.start], ["Entrega", doc.end], ["Validade", doc.validity]].filter(([, v]) => has(v));
  const coverBg = (doc.gradient && has(doc.accent2))
    ? `linear-gradient(150deg, ${accent} 0%, ${doc.accent2} 100%)`
    : `linear-gradient(150deg, ${darken(accent, 0.12)} 0%, ${darken(accent, 0.55)} 100%)`;
  return (
    <div style={{ background: T.bg, color: T.ink, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 16px 48px -18px rgba(20,20,30,0.3)", overflowWrap: "anywhere", wordBreak: "break-word" }}>
      <div style={{ position: "relative", background: coverBg, color: "#fff", padding: "34px 30px 32px", overflow: "hidden" }}>
        <div aria-hidden="true" style={{ position: "absolute", right: -40, bottom: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <Mono doc={doc} size={32} radius={9} bg="rgba(255,255,255,0.2)" />
          <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.9 }}>Proposta comercial</span>
        </div>
        <div style={{ position: "relative", fontFamily: font.heading, fontWeight: 900, fontSize: 38, lineHeight: 0.98, letterSpacing: "-0.035em", textTransform: "uppercase", marginBottom: 16 }}><Ed onEdit={onEdit} field="title">{doc.title || "Título da proposta"}</Ed></div>
        <span style={{ position: "relative", display: "inline-block", fontSize: "13px", fontWeight: 700, letterSpacing: "0.02em", color: darken(accent, 0.2), background: "#fff", borderRadius: 999, padding: "7px 16px" }}>
          <Ed onEdit={onEdit} field="client">{doc.client || "Cliente"}</Ed>{has(doc.company) ? ` · ${doc.company}` : ""}
        </span>
      </div>
      <div style={{ padding: "26px 30px 30px" }}>
        {has(doc.scope) && <p style={{ fontSize: 14, lineHeight: 1.65, color: T.sub, margin: "0 0 22px" }}><Ed onEdit={onEdit} field="scope">{doc.scope}</Ed></p>}
        {items.length > 0 && (<>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 18 }}>
            {items.map((it, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < items.length - 1 ? `1px solid ${T.line}` : "none", fontSize: 14 }}>
                <span style={{ color: T.sub }}><Ed onEdit={onEdit} field="items">{it.desc || "Item"}</Ed></span><span style={{ fontWeight: 700, color: T.ink, fontVariantNumeric: "tabular-nums" }}>{money(it.value)}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 22, background: panelFor(accent, T), borderRadius: 10, padding: "12px 15px" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: deep }}>Total</span>
            <span style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 30, letterSpacing: "-0.03em", color: deep, fontVariantNumeric: "tabular-nums" }}>{brl(total)}</span>
          </div>
        </>)}
        {dates.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
            {dates.map(([k, v]) => (<span key={k} style={{ fontSize: "12.5px", color: T.sub, background: T.panel, borderRadius: 8, padding: "6px 11px" }}><b style={{ color: T.soft, fontWeight: 600 }}>{k}:</b> {v}</span>))}
          </div>
        )}
        {has(doc.bio) && (
          <div style={{ marginBottom: 22 }}>
            <div style={kicker(T.soft)}>Sobre mim</div>
            <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: T.sub, margin: 0 }}><Ed onEdit={onEdit} field="bio">{doc.bio}</Ed></p>
          </div>
        )}
        <button onClick={onAccept} style={{ width: "100%", fontFamily: font.body, fontSize: 15, fontWeight: 700, color: btnText(accent), background: accent, border: "none", padding: 14, borderRadius: 11, cursor: "pointer" }}>Aceitar proposta</button>
      </div>
    </div>
  );
}

export const DESIGNS = [
  { id: "minimal", name: "Minimal", tag: "Clean", accent: "#0A0A0A", Comp: Minimal, cat: "clean" },
  { id: "bold", name: "Bold", tag: "Impacto", accent: "#D97757", Comp: Bold, cat: "vibrante" },
  { id: "editorial", name: "Editorial", tag: "Formal", accent: "#2E7D51", Comp: Editorial, cat: "clean" },
  { id: "colorido", name: "Colorido", tag: "Vibrante", accent: "#6C48B0", Comp: Colorido, cat: "vibrante" },
  { id: "capa", name: "Capa", tag: "Com foto", accent: "#D97757", Comp: Capa, cover: true, cat: "foto" },
  { id: "dossie", name: "Dossiê", tag: "Foto escura", accent: "#D97757", Comp: Dossie, cover: true, cat: "foto" },
  { id: "carta", name: "Carta", tag: "Elegante", accent: "#8A5A1A", Comp: Carta, cat: "clean", novo: true },
  { id: "aurora", name: "Aurora", tag: "Suave", accent: "#3A5BB5", Comp: Aurora, cat: "vibrante", novo: true },
  { id: "studio", name: "Studio", tag: "Duas colunas", accent: "#D97757", Comp: Studio, cat: "escuro", novo: true },
  { id: "recibo", name: "Recibo", tag: "Criativo", accent: "#D97757", Comp: Recibo, cat: "criativo", novo: true },
  { id: "grande", name: "Grande", tag: "Agência", accent: "#5B3DF0", Comp: Grande, cat: "clean", novo: true },
  { id: "poster", name: "Pôster", tag: "Impacto", accent: "#5B3DF0", Comp: Poster, cat: "vibrante", novo: true },
];

export function ProposalDesign({ id, doc, accent, onAccept, onEdit }) {
  const d = DESIGNS.find((x) => x.id === id) || DESIGNS[0];
  const Comp = d.Comp;
  return <Comp doc={doc} accent={accent || doc.accent || d.accent} onAccept={onAccept} onEdit={onEdit} />;
}
