import { Router } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env.js";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimit.js";
import {
  googleConfigured, buildAuthUrl, exchangeCode, getUserEmail, revokeToken,
} from "../lib/googleMail.js";
import { getAccount, saveAccount, deleteAccount } from "../lib/googleAccount.js";
import { open } from "../lib/secretbox.js";

const r = Router();

// Redireciona o navegador de volta ao app com um parâmetro de resultado.
const back = (res, param) => res.redirect(`${env.APP_URL}/app/configuracoes?${param}`);

// Status da conexão de Gmail (para a tela de Configurações).
r.get("/google/status", requireAuth, async (req, res, next) => {
  try {
    const acc = await getAccount(req.user.id);
    res.json({ configured: googleConfigured(), connected: Boolean(acc), email: acc?.email || null });
  } catch (e) { next(e); }
});

// Passo 1: devolve a URL da tela de consentimento do Google. O `state` é um token
// curto assinado, que amarra o callback a este usuário (anti-CSRF).
r.get("/google/connect", requireAuth, authLimiter, async (req, res, next) => {
  try {
    if (!googleConfigured()) return res.status(501).json({ error: "Envio por e-mail não configurado no servidor." });
    const state = jwt.sign({ sub: req.user.id, purpose: "gmail-connect" }, env.JWT_SECRET, { expiresIn: "10m" });
    res.json({ url: buildAuthUrl(state) });
  } catch (e) { next(e); }
});

// Passo 2: o Google redireciona o NAVEGADOR para cá com ?code e ?state. Sem
// requireAuth (é uma navegação, não uma chamada com Bearer): a identidade vem do
// state assinado. Troca o code por tokens, guarda e volta pro app.
r.get("/google/callback", async (req, res) => {
  try {
    if (!googleConfigured()) return back(res, "gmail=erro");
    const { code, state, error } = req.query;
    if (error) return back(res, "gmail=cancelado");
    if (!code || !state) return back(res, "gmail=erro");

    let userId;
    try {
      const p = jwt.verify(String(state), env.JWT_SECRET);
      if (p.purpose !== "gmail-connect") throw new Error("bad purpose");
      userId = p.sub;
    } catch {
      return back(res, "gmail=erro");
    }

    const tok = await exchangeCode(String(code));
    if (!tok.refresh_token) {
      // Sem refresh_token (o usuário já havia consentido antes sem revogar).
      // prompt=consent normalmente força um novo; se ainda assim faltar, avisa.
      return back(res, "gmail=sem_refresh");
    }
    const email = await getUserEmail(tok.access_token);
    await saveAccount(userId, {
      email,
      refreshToken: tok.refresh_token,
      accessToken: tok.access_token,
      expiresIn: tok.expires_in,
      scope: tok.scope,
    });
    back(res, "gmail=conectado");
  } catch (e) {
    console.error("[gmail callback]", e.message);
    back(res, "gmail=erro");
  }
});

// Desconecta: revoga no Google (best-effort) e apaga a credencial.
r.delete("/google", requireAuth, async (req, res, next) => {
  try {
    const acc = await getAccount(req.user.id);
    if (acc) {
      const refresh = open(acc.refresh_token_enc);
      if (refresh) await revokeToken(refresh);
      await deleteAccount(req.user.id);
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default r;
