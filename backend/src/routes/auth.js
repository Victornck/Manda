import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { query } from "../db.js";
import { env } from "../env.js";
import { signToken } from "../lib/jwt.js";
import { registerSchema, loginSchema } from "../lib/validate.js";
import { isValidCPF, cpfDigits } from "../lib/cpf.js";
import { encryptCpf, cpfIndex } from "../lib/pii.js";
import { authLimiter, loginLimiter, emailLimiter, codeLimiter } from "../middleware/rateLimit.js";
import { requireAuth } from "../middleware/auth.js";
import { issueCode, consumeCode } from "../lib/passwordCodes.js";
import { sendMail, codeEmailHtml } from "../lib/mailer.js";
import { isCurrency } from "../lib/currency.js";
import { planFeatures, proposalCap } from "../lib/plans.js";

const googleClient = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

// Perfil: nome sempre; moeda da conta opcional (só troca se vier uma válida).
const profileSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  currency: z.string().optional(),
});
const emailSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({
  email: z.string().email(),
  code: z.string().trim().min(4).max(10),
});
const changeSchema = z.object({
  code: z.string().trim().min(4).max(10),
  next: z.string().min(8).max(200),
});

const r = Router();

// Nunca expõe cpf nem password_hash. Admin aparece com plano efetivo total.
const safeUser = (u) => {
  const effectivePlan = u.role === "admin" ? "business" : (u.plan || "free");
  return {
    id: u.id, name: u.name, email: u.email,
    plan: effectivePlan,
    role: u.role === "admin" ? "admin" : undefined,
    currency: u.currency || "BRL",
    // Permissões vêm do backend (fonte única em plans.js): o front NÃO hardcoda.
    features: planFeatures(effectivePlan),
    proposalLimit: proposalCap(effectivePlan), // { scope, limit } — Infinity vira null no JSON
  };
};

r.post("/register", authLimiter, async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    if (!isValidCPF(data.cpf)) return res.status(400).json({ error: "CPF inválido." });
    const cpf = cpfDigits(data.cpf);
    const hash = await bcrypt.hash(data.password, 12);
    let rows;
    try {
      ({ rows } = await query(
        "insert into users (name,email,cpf_enc,cpf_hash,password_hash) values ($1,$2,$3,$4,$5) returning *",
        [data.name, data.email.toLowerCase(), encryptCpf(cpf), cpfIndex(cpf), hash]
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

r.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const { rows } = await query("select * from users where email=$1", [data.email.toLowerCase()]);
    const u = rows[0];
    const ok = u && (await bcrypt.compare(data.password, u.password_hash));
    if (!ok) return res.status(401).json({ error: "Email ou senha incorretos." });
    res.json({ token: signToken({ sub: u.id }), user: safeUser(u) });
  } catch (e) { next(e); }
});

// Login/cadastro com Google. Verifica o ID token do Google e emite NOSSO JWT.
// Fluxo: conta existente -> loga; conta nova -> pede CPF (needsCpf) e, na 2ª
// chamada com o mesmo token + cpf, cria a conta.
r.post("/google", authLimiter, async (req, res, next) => {
  try {
    if (!googleClient) return res.status(501).json({ error: "Login com Google não configurado." });
    const { credential, cpf } = req.body || {};
    if (!credential) return res.status(400).json({ error: "Token do Google ausente." });

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: env.GOOGLE_CLIENT_ID });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ error: "Login com Google inválido ou expirado." });
    }
    const email = String(payload?.email || "").toLowerCase();
    const name = payload?.name || payload?.given_name || "Usuário";
    const googleId = payload?.sub;
    if (!email || !payload?.email_verified) return res.status(400).json({ error: "Email do Google não verificado." });

    const { rows } = await query("select * from users where email=$1", [email]);
    let u = rows[0];
    if (u) {
      if (!u.google_id) await query("update users set google_id=$2 where id=$1", [u.id, googleId]).catch(() => {});
      return res.json({ token: signToken({ sub: u.id }), user: safeUser(u) });
    }

    // Conta nova: só cria depois que o CPF é informado (etapa extra no front).
    if (!cpf) return res.json({ needsCpf: true, name, email });
    if (!isValidCPF(cpf)) return res.status(400).json({ error: "CPF inválido." });
    try {
      const dg = cpfDigits(cpf);
      const ins = await query(
        "insert into users (name,email,cpf_enc,cpf_hash,google_id) values ($1,$2,$3,$4,$5) returning *",
        [name, email, encryptCpf(dg), cpfIndex(dg), googleId]
      );
      u = ins.rows[0];
    } catch (e) {
      if (e.code === "23505") {
        const field = String(e.constraint || "").includes("cpf") ? "CPF" : "email";
        return res.status(409).json({ error: `Já existe uma conta com este ${field}.` });
      }
      throw e;
    }
    res.status(201).json({ token: signToken({ sub: u.id }), user: safeUser(u) });
  } catch (e) { next(e); }
});

r.get("/me", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query("select * from users where id=$1", [req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: "Usuário não encontrado." });
    res.json({ user: safeUser(rows[0]) });
  } catch (e) { next(e); }
});

// Atualiza o nome de exibição e/ou a moeda padrão da conta.
r.patch("/profile", requireAuth, async (req, res, next) => {
  try {
    const body = profileSchema.parse(req.body);
    const sets = [];
    const vals = [req.user.id];
    if (body.name !== undefined) { vals.push(body.name); sets.push(`name=$${vals.length}`); }
    if (body.currency !== undefined && isCurrency(body.currency)) { vals.push(body.currency); sets.push(`currency=$${vals.length}`); }
    if (!sets.length) return res.status(400).json({ error: "Nada para atualizar." });
    const { rows } = await query(`update users set ${sets.join(", ")} where id=$1 returning *`, vals);
    if (!rows[0]) return res.status(404).json({ error: "Usuário não encontrado." });
    res.json({ user: safeUser(rows[0]) });
  } catch (e) { next(e); }
});

// ── Esqueci a senha (deslogado) ─────────────────────────────────────────────
// Passo 1: verifica se o email EXISTE antes de enviar. Só emite código para a
// conta daquele email; se não existir (ou for conta só-Google), avisa e não envia.
// Obs.: revelar se o email existe já é possível pelo /register (409), então não
// há ganho em manter resposta genérica aqui — e a UX fica muito melhor.
r.post("/forgot", emailLimiter, async (req, res, next) => {
  try {
    const { email } = emailSchema.parse(req.body);
    const { rows } = await query(
      "select id, name, email, password_hash from users where email=$1",
      [email.toLowerCase()]
    );
    const u = rows[0];
    if (!u) return res.status(404).json({ error: "Não encontramos uma conta com este email." });
    if (!u.password_hash) return res.status(400).json({ error: "Essa conta entra com o Google. Use o botão “Entrar com Google”." });
    const issued = await issueCode(u.id, "reset");
    if (issued.cooldown) return res.status(429).json({ error: "Já enviamos um código há pouco. Aguarde 1 minuto para pedir outro." });
    const code = issued.code;
    try {
      await sendMail({
        to: u.email,
        subject: "Seu código para entrar — Manda",
        text: `Olá, ${u.name}. Seu código para entrar é ${code}. Ele expira em 10 minutos. Se não foi você, ignore este email.`,
        html: codeEmailHtml(u.name, code, "redefinir"),
      });
    } catch (e) {
      console.error("[forgot] email:", e.message);
      return res.status(502).json({ error: "Não foi possível enviar o email agora. Tente de novo em instantes." });
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Passo 2: o código correto AUTENTICA (como no Telegram): devolve nosso JWT e a
// pessoa entra no app. A troca de senha acontece depois, em Configurações.
// Mensagens de erro genéricas (anti-enumeração de emails).
r.post("/reset", codeLimiter, async (req, res, next) => {
  try {
    const { email, code } = resetSchema.parse(req.body);
    const { rows } = await query(
      "select * from users where email=$1 and password_hash is not null",
      [email.toLowerCase()]
    );
    const u = rows[0];
    if (!u) return res.status(400).json({ error: "Código inválido ou expirado." });
    const v = await consumeCode(u.id, "reset", code);
    if (!v.ok) return res.status(400).json({ error: v.reason });
    res.json({ token: signToken({ sub: u.id }), user: safeUser(u) });
  } catch (e) { next(e); }
});

// ── Troca de senha no painel (logado) ───────────────────────────────────────
// Passo 1: envia um código para o email do próprio usuário.
r.post("/password/request-code", requireAuth, emailLimiter, async (req, res, next) => {
  try {
    const { rows } = await query("select id, name, email, password_hash from users where id=$1", [req.user.id]);
    const u = rows[0];
    if (!u) return res.status(404).json({ error: "Usuário não encontrado." });
    if (!u.password_hash) return res.status(400).json({ error: "Sua conta entra com o Google e não tem senha para trocar." });
    const issued = await issueCode(u.id, "change");
    if (issued.cooldown) return res.status(429).json({ error: "Já enviamos um código há pouco. Aguarde 1 minuto para pedir outro." });
    const code = issued.code;
    try {
      await sendMail({
        to: u.email,
        subject: "Seu código para trocar a senha — Manda",
        text: `Olá, ${u.name}. Seu código para trocar a senha é ${code}. Ele expira em 10 minutos.`,
        html: codeEmailHtml(u.name, code, "trocar"),
      });
    } catch (e) {
      console.error("[request-code] email:", e.message);
      return res.status(502).json({ error: "Não foi possível enviar o email agora. Tente de novo em instantes." });
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Passo 2: valida o código enviado por email e grava a nova senha.
r.post("/password", requireAuth, codeLimiter, async (req, res, next) => {
  try {
    const { code, next: newPw } = changeSchema.parse(req.body);
    const v = await consumeCode(req.user.id, "change", code);
    if (!v.ok) return res.status(400).json({ error: v.reason });
    const hash = await bcrypt.hash(newPw, 12);
    await query("update users set password_hash=$2 where id=$1", [req.user.id, hash]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default r;
