import { Router } from "express";
import { query } from "../db.js";

const r = Router();

// Só os campos que o cliente pode ver. Nada de PII do dono nem client_email.
const publicView = (p) => ({
  client: p.client, company: p.company, title: p.title, scope: p.scope, items: p.items,
  start: p.start_date, end: p.end_date, payment: p.payment, revisions: p.revisions,
  validity: p.validity, bio: p.bio, accent: p.accent, accent2: p.accent2, gradient: p.gradient,
  logo: p.logo, cover: p.cover, template: p.template, status: p.status, currency: p.currency || "BRL",
  showQty: !!p.show_qty,
  createdAt: p.created_at,
});

// Rascunho nao tem link publico ativo. Sem isso, como rascunho nao consome
// cota, bastaria nunca concluir e distribuir o link do rascunho pra usar o
// produto sem limite. Para quem esta de fora, rascunho simplesmente nao existe.
const isLive = (p) => !!p && p.status !== "draft";

// Momento em que a proposta foi respondida (aceita/recusada). Vem do evento
// registrado; se o dono marcou manualmente pelo painel (sem evento), cai no
// updated_at, que e quando o status mudou.
async function decidedAt(p) {
  if (!["accepted", "declined"].includes(p.status)) return null;
  const { rows } = await query(
    "select created_at from proposal_events where proposal_id=$1 and type=$2 order by created_at desc limit 1",
    [p.id, p.status]
  );
  return rows[0]?.created_at || p.updated_at || null;
}

// Detecção de bots de link-preview (WhatsApp, Slack, Telegram, etc.) e prefetch.
// Eles pré-carregam a URL quando o link é ENVIADO — não é um humano vendo.
const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|discord|slack|twitter|linkedin|embedly|preview|pinterest|redditbot|quora|skype|vkshare|googlebot|bingbot|applebot|petalbot|monitor|uptime|curl|wget|python-requests|axios|node-fetch|headless/i;
function isBot(req) {
  const ua = String(req.headers["user-agent"] || "");
  if (!ua || BOT_RE.test(ua)) return true;
  const purpose = String(
    req.headers["purpose"] || req.headers["x-purpose"] || req.headers["sec-purpose"] || ""
  );
  if (/prefetch|preview|preload/i.test(purpose)) return true;
  return false;
}

// GET apenas ENTREGA a proposta. Não marca visualização aqui: bots de preview
// também fazem GET. A visualização real é confirmada pelo POST /view abaixo,
// disparado por JavaScript — que só roda em navegador de gente de verdade.
r.get("/:publicId", async (req, res, next) => {
  try {
    const { rows } = await query("select * from proposals where public_id=$1", [req.params.publicId]);
    const p = rows[0];
    if (!isLive(p)) return res.status(404).json({ error: "Proposta não encontrada." });
    res.json({ proposal: { ...publicView(p), decidedAt: await decidedAt(p) } });
  } catch (e) { next(e); }
});

// Confirmação de visualização real (chamada pelo front após renderizar).
r.post("/:publicId/view", async (req, res, next) => {
  try {
    if (isBot(req)) return res.json({ ok: true, skipped: "bot" });
    const { rows } = await query("select id, status from proposals where public_id=$1", [req.params.publicId]);
    const p = rows[0];
    if (!isLive(p)) return res.status(404).json({ error: "Proposta não encontrada." });
    query(
      "insert into proposal_events(proposal_id,type,meta) values($1,'viewed',$2)",
      [p.id, JSON.stringify({ ip: req.ip, ua: req.headers["user-agent"] || "" })]
    ).catch(() => {});
    if (p.status === "sent") {
      await query("update proposals set status='viewed', updated_at=now() where id=$1", [p.id]).catch(() => {});
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Resposta do cliente (aceite/recusa). O update so acontece se a proposta
// ainda estiver em aberto ("status in ('sent','viewed')"), e o evento so e
// gravado quando ESSE update de fato mudou a linha. Assim dois cliques, duas
// abas ou duas requisicoes simultaneas nunca geram dois eventos: o banco
// escolhe um vencedor e o outro apenas recebe o estado ja decidido.
async function respond(req, res, next, status, type) {
  try {
    const { rows } = await query("select id,status,updated_at from proposals where public_id=$1", [req.params.publicId]);
    const p = rows[0];
    if (!isLive(p)) return res.status(404).json({ error: "Proposta não encontrada." });
    if (["accepted", "declined"].includes(p.status)) {
      return res.json({ ok: true, status: p.status, decidedAt: await decidedAt(p), already: true });
    }
    const upd = await query(
      "update proposals set status=$2, updated_at=now() where id=$1 and status in ('sent','viewed') returning id, status, updated_at",
      [p.id, status]
    );
    if (!upd.rows[0]) {
      const again = (await query("select id,status,updated_at from proposals where id=$1", [p.id])).rows[0];
      return res.json({ ok: true, status: again.status, decidedAt: await decidedAt(again), already: true });
    }
    const ev = await query("insert into proposal_events(proposal_id,type) values($1,$2) returning created_at", [p.id, type]).catch(() => null);
    res.json({ ok: true, status, decidedAt: ev?.rows[0]?.created_at || upd.rows[0].updated_at });
  } catch (e) { next(e); }
}

r.post("/:publicId/accept", (req, res, next) => respond(req, res, next, "accepted", "accepted"));
r.post("/:publicId/decline", (req, res, next) => respond(req, res, next, "declined", "declined"));

export default r;
