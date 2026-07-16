import { Router } from "express";
import { query } from "../db.js";

const r = Router();

// Só os campos que o cliente pode ver. Nada de PII do dono nem client_email.
const publicView = (p) => ({
  client: p.client, company: p.company, title: p.title, scope: p.scope, items: p.items,
  start: p.start_date, end: p.end_date, payment: p.payment, revisions: p.revisions,
  validity: p.validity, bio: p.bio, accent: p.accent, template: p.template, status: p.status,
});

r.get("/:publicId", async (req, res, next) => {
  try {
    const { rows } = await query("select * from proposals where public_id=$1", [req.params.publicId]);
    const p = rows[0];
    if (!p) return res.status(404).json({ error: "Proposta não encontrada." });
    // Registra a visualização (não bloqueia a resposta).
    query("insert into proposal_events(proposal_id,type,meta) values($1,'viewed',$2)", [p.id, JSON.stringify({ ip: req.ip })]).catch(() => {});
    if (p.status === "sent") query("update proposals set status='viewed', updated_at=now() where id=$1", [p.id]).catch(() => {});
    res.json({ proposal: publicView(p) });
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
