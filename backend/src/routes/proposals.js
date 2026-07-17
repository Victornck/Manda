import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { proposalSchema, statusSchema } from "../lib/validate.js";
import { publicId } from "../lib/ids.js";
import { PLAN_LIMITS, templateAllowed } from "../lib/plans.js";

const r = Router();
r.use(requireAuth); // tudo aqui exige login

const getPlan = async (userId) => {
  const { rows } = await query("select plan from users where id=$1", [userId]);
  return rows[0]?.plan || "free";
};

const sumItems = (items = []) =>
  items.reduce((a, it) => a + (parseInt(String(it.value || "").replace(/\D/g, ""), 10) || 0), 0);

const toProposal = (p) => ({
  id: p.id, publicId: p.public_id, client: p.client, company: p.company, clientEmail: p.client_email,
  title: p.title, scope: p.scope, items: p.items, start: p.start_date, end: p.end_date,
  payment: p.payment, revisions: p.revisions, validity: p.validity, bio: p.bio,
  accent: p.accent, accent2: p.accent2, gradient: p.gradient, template: p.template,
  status: p.status, value: Number(p.value),
  createdAt: p.created_at, updatedAt: p.updated_at,
});

r.get("/", async (req, res, next) => {
  try {
    const { rows } = await query("select * from proposals where user_id=$1 order by created_at desc", [req.user.id]);
    res.json({ proposals: rows.map(toProposal) });
  } catch (e) { next(e); }
});

// Painel financeiro. Definido antes de /:id para não conflitar na rota.
r.get("/stats", async (req, res, next) => {
  try {
    const { rows } = await query("select client, company, status, value, created_at from proposals where user_id=$1", [req.user.id]);
    const num = (v) => Number(v) || 0;
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const receita = rows.filter((x) => x.status === "accepted" && new Date(x.created_at) >= monthStart).reduce((a, x) => a + num(x.value), 0);
    const emAberto = rows.filter((x) => ["sent", "viewed"].includes(x.status)).reduce((a, x) => a + num(x.value), 0);
    const enviadas = rows.filter((x) => x.status !== "draft").length;
    const aceitas = rows.filter((x) => x.status === "accepted").length;
    const conversao = enviadas ? Math.round((aceitas / enviadas) * 100) : 0;
    const map = {};
    rows.forEach((x) => {
      const k = (x.client || "Sem cliente").trim() || "Sem cliente";
      if (!map[k]) map[k] = { client: k, company: x.company || "", count: 0, value: 0, opened: false, accepted: 0 };
      const g = map[k];
      g.count += 1;
      g.value += num(x.value);
      if (["viewed", "accepted", "declined"].includes(x.status)) g.opened = true;
      if (x.status === "accepted") g.accepted += 1;
      if (!g.company && x.company) g.company = x.company;
    });
    res.json({ kpis: { receita, emAberto, enviadas, aceitas, conversao }, clients: Object.values(map).sort((a, b) => b.value - a.value) });
  } catch (e) { next(e); }
});

// Notificações: interações reais do cliente (visualizou/aceitou/recusou).
// Definido antes de /:id para não conflitar na rota.
r.get("/notifications", async (req, res, next) => {
  try {
    const { rows } = await query(
      `select e.id, e.type, e.created_at, p.client, p.title, p.public_id
         from proposal_events e
         join proposals p on p.id = e.proposal_id
        where p.user_id = $1 and e.type in ('viewed','accepted','declined')
        order by e.created_at desc
        limit 50`,
      [req.user.id]
    );
    res.json({
      notifications: rows.map((n) => ({
        id: n.id, type: n.type, client: n.client, title: n.title, publicId: n.public_id, createdAt: n.created_at,
      })),
    });
  } catch (e) { next(e); }
});

r.get("/:id", async (req, res, next) => {
  try {
    const { rows } = await query("select * from proposals where id=$1 and user_id=$2", [req.params.id, req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: "Proposta não encontrada." });
    res.json({ proposal: toProposal(rows[0]) });
  } catch (e) { next(e); }
});

r.post("/", async (req, res, next) => {
  try {
    const d = proposalSchema.parse(req.body);
    // Regras de acesso do plano
    const plan = await getPlan(req.user.id);
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
    if (!templateAllowed(plan, d.template)) {
      return res.status(402).json({ error: "Seu plano não inclui este template." });
    }
    if (limits.proposalsPerMonth !== Infinity) {
      const { rows: c } = await query(
        "select count(*)::int as n from proposals where user_id=$1 and created_at >= date_trunc('month', now())",
        [req.user.id]
      );
      if ((c[0]?.n || 0) >= limits.proposalsPerMonth) {
        return res.status(402).json({
          error: plan === "free"
            ? "Assine um plano para criar propostas."
            : `Seu plano permite ${limits.proposalsPerMonth} propostas por mês.`,
        });
      }
    }
    const { rows } = await query(
      `insert into proposals (user_id, public_id, client, company, client_email, title, scope, items, start_date, end_date, payment, revisions, validity, bio, accent, accent2, gradient, template, value)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) returning *`,
      [req.user.id, publicId(), d.client, d.company, d.clientEmail, d.title, d.scope, JSON.stringify(d.items), d.start, d.end, d.payment, d.revisions, d.validity, d.bio, d.accent, d.accent2, d.gradient, d.template, sumItems(d.items)]
    );
    res.status(201).json({ proposal: toProposal(rows[0]) });
  } catch (e) { next(e); }
});

r.put("/:id", async (req, res, next) => {
  try {
    const d = proposalSchema.parse(req.body);
    const plan = await getPlan(req.user.id);
    if (!templateAllowed(plan, d.template)) {
      return res.status(402).json({ error: "Seu plano não inclui este template." });
    }
    const { rows } = await query(
      `update proposals set client=$3, company=$4, client_email=$5, title=$6, scope=$7, items=$8, start_date=$9, end_date=$10, payment=$11, revisions=$12, validity=$13, bio=$14, accent=$15, accent2=$16, gradient=$17, template=$18, value=$19, updated_at=now()
       where id=$1 and user_id=$2 returning *`,
      [req.params.id, req.user.id, d.client, d.company, d.clientEmail, d.title, d.scope, JSON.stringify(d.items), d.start, d.end, d.payment, d.revisions, d.validity, d.bio, d.accent, d.accent2, d.gradient, d.template, sumItems(d.items)]
    );
    if (!rows[0]) return res.status(404).json({ error: "Proposta não encontrada." });
    res.json({ proposal: toProposal(rows[0]) });
  } catch (e) { next(e); }
});

r.patch("/:id/status", async (req, res, next) => {
  try {
    const { status } = statusSchema.parse(req.body);
    const { rows } = await query("update proposals set status=$3, updated_at=now() where id=$1 and user_id=$2 returning *", [req.params.id, req.user.id, status]);
    if (!rows[0]) return res.status(404).json({ error: "Proposta não encontrada." });
    res.json({ proposal: toProposal(rows[0]) });
  } catch (e) { next(e); }
});

r.delete("/:id", async (req, res, next) => {
  try {
    const { rowCount } = await query("delete from proposals where id=$1 and user_id=$2", [req.params.id, req.user.id]);
    if (!rowCount) return res.status(404).json({ error: "Proposta não encontrada." });
    res.status(204).end();
  } catch (e) { next(e); }
});

export default r;
