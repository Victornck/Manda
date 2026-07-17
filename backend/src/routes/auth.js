import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { query } from "../db.js";
import { signToken } from "../lib/jwt.js";
import { registerSchema, loginSchema } from "../lib/validate.js";
import { isValidCPF, cpfDigits } from "../lib/cpf.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { requireAuth } from "../middleware/auth.js";

const profileSchema = z.object({ name: z.string().trim().min(1).max(120) });
const passwordSchema = z.object({ current: z.string().min(1), next: z.string().min(8).max(200) });

const r = Router();

// Nunca expõe cpf nem password_hash.
const safeUser = (u) => ({ id: u.id, name: u.name, email: u.email, plan: u.plan });

r.post("/register", authLimiter, async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    if (!isValidCPF(data.cpf)) return res.status(400).json({ error: "CPF inválido." });
    const cpf = cpfDigits(data.cpf);
    const hash = await bcrypt.hash(data.password, 12);
    let rows;
    try {
      ({ rows } = await query(
        "insert into users (name,email,cpf,password_hash) values ($1,$2,$3,$4) returning *",
        [data.name, data.email.toLowerCase(), cpf, hash]
      ));
    } catch (e) {
      if (e.code === "23505") {
        const field = String(e.constraint || "").includes("cpf") ? "CPF" : "email";
        return res.status(409).json({ error: `Já existe uma conta com este ${field}.` });
      }
      throw e;
    }
    const u = rows[0];
    res.status(201).json({ token: signToken({ sub: u.id }), user: safeUser(u) });
  } catch (e) { next(e); }
});

r.post("/login", authLimiter, async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const { rows } = await query("select * from users where email=$1", [data.email.toLowerCase()]);
    const u = rows[0];
    const ok = u && (await bcrypt.compare(data.password, u.password_hash));
    if (!ok) return res.status(401).json({ error: "Email ou senha incorretos." });
    res.json({ token: signToken({ sub: u.id }), user: safeUser(u) });
  } catch (e) { next(e); }
});

r.get("/me", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query("select * from users where id=$1", [req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: "Usuário não encontrado." });
    res.json({ user: safeUser(rows[0]) });
  } catch (e) { next(e); }
});

// Atualiza o nome de exibição.
r.patch("/profile", requireAuth, async (req, res, next) => {
  try {
    const { name } = profileSchema.parse(req.body);
    const { rows } = await query("update users set name=$2 where id=$1 returning *", [req.user.id, name]);
    if (!rows[0]) return res.status(404).json({ error: "Usuário não encontrado." });
    res.json({ user: safeUser(rows[0]) });
  } catch (e) { next(e); }
});

// Troca a senha, exigindo a senha atual correta.
r.post("/password", requireAuth, async (req, res, next) => {
  try {
    const { current, next: newPw } = passwordSchema.parse(req.body);
    const { rows } = await query("select password_hash from users where id=$1", [req.user.id]);
    const u = rows[0];
    if (!u) return res.status(404).json({ error: "Usuário não encontrado." });
    const ok = await bcrypt.compare(current, u.password_hash);
    if (!ok) return res.status(400).json({ error: "Senha atual incorreta." });
    const hash = await bcrypt.hash(newPw, 12);
    await query("update users set password_hash=$2 where id=$1", [req.user.id, hash]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default r;
