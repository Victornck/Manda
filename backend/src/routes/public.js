import { Router } from "express";
import { query } from "../db.js";

const r = Router();

// Só os campos que o cliente pode ver. Nada de PII do dono nem client_email.
const publicView = (p) => ({
  client: p.client, company: p.company, title: p.title, scope: p.scope, items: p.items,
  start: p.start_date, end: p.end_date, payment: p.payment, revisions: p.revisions,
  validity: p.validity, bio: p.bio, accent: p.accent, accent2: p.accent2, gradient: p.gradient,
  logo: p.logo, cover: p.cover, template: p.template, status: p.status, currency: p.currency || "BRL",
});

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
    if (!p) return res.status(404).json({ error: "Proposta não encontrada." });
    res.json({ proposal: publicView(p) });
  } catch (e) { next(e); }
});

// Confirmação de visualização real (chamada pelo front após renderizar).
r.post("/:publicId/view", async (req, res, next) => {
  try {
    if (isBot(req)) return res.json({ ok: true, skipped: "bot" });
    const { rows } = await query("select id, status from proposals where public_id=$1", [req.params.publicId]);
    const p = rows[0];
    if (!p) return res.status(404).json({ error: "Proposta não encontrada." });
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

async function respond(req, res, next, status, type) {
  try {
    const { rows } = await query("select id,status from proposals where public_id=$1", [req.params.publicId]);
    const p = rows[0];
    if (!p) return res.status(404).json({ error: "Proposta não encontrada." });
    if (["accepted", "declined"].includes(p.status)) return res.json({ ok: true, status: p.status });
    await query("update proposals set status=$2, updated_at=now() where id=$1", [p.id, status]);
    query("insert into proposal_events(proposal_id,type) values($1,$2)", [p.id, type]).catch(() => {});
    res.json({ ok: true, status });
  } catch (e) { next(e); }
}

r.post("/:publicId/accept", (req, res, next) => respond(req, res, next, "accepted", "accepted"));
r.post("/:publicId/decline", (req, res, next) => respond(req, res, next, "declined", "declined"));

export default r;
