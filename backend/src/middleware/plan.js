import { query } from "../db.js";
import { hasPlan } from "../lib/plans.js";

// Protege recursos por plano. Lê o plano do BANCO (fonte única da verdade),
// nunca do token — assim um token antigo não "engana" o sistema.
export function requirePlan(minPlan) {
  return async (req, res, next) => {
    try {
      const { rows } = await query("select plan from users where id=$1", [req.user.id]);
      const plan = rows[0]?.plan || "free";
      if (!hasPlan(plan, minPlan)) {
        return res.status(402).json({ error: `Este recurso exige o plano ${minPlan}.` });
      }
      req.userPlan = plan;
      next();
    } catch (e) { next(e); }
  };
}
