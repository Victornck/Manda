import { Router } from "express";
import { z } from "zod";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { requireAuth } from "../middleware/auth.js";
import { writeLimiter } from "../middleware/rateLimit.js";
import { uploadsDir } from "../lib/uploads.js";
import { query } from "../db.js";
import { isSuspended } from "../lib/plans.js";

const r = Router();

// Recebe a imagem como data URL (o front já comprime antes), grava no disco e
// devolve uma URL curta. Assim o banco guarda só o link, não a imagem em base64.
const schema = z.object({
  image: z.string().startsWith("data:image/").max(3_600_000),
});

// Só formatos raster, que o navegador NUNCA executa como código. SVG fica de
// fora de propósito: SVG é XML e pode carregar <script> dentro.
const ALLOWED = { png: "png", jpeg: "jpg", jpg: "jpg", webp: "webp", gif: "gif" };

// Confere a "assinatura" dos primeiros bytes: garante que o conteúdo é mesmo a
// imagem que o cabeçalho promete, e não um arquivo disfarçado.
function sniff(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.toString("ascii", 0, 4) === "GIF8") return "gif";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

r.post("/image", requireAuth, writeLimiter, async (req, res, next) => {
  try {
    // Assinatura vencida: conta em só-leitura, não aceita novos arquivos.
    const { rows } = await query("select plan, role, current_period_end from users where id=$1", [req.user.id]);
    if (isSuspended(rows[0])) {
      return res.status(402).json({ suspended: true, error: "Sua assinatura venceu. Renove para enviar imagens." });
    }
    const { image } = schema.parse(req.body);
    // Lista fechada de formatos e base64 estrito — nada de subtipo livre.
    const m = /^data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/=]+)$/i.exec(image);
    if (!m) return res.status(400).json({ error: "Envie uma imagem PNG, JPG, WEBP ou GIF." });
    const ext = ALLOWED[m[1].toLowerCase()];
    const buf = Buffer.from(m[2], "base64");
    if (buf.length > 2.6 * 1024 * 1024) return res.status(413).json({ error: "Imagem grande demais (máx. 2 MB)." });
    // O conteúdo real tem que bater com o formato declarado.
    if (sniff(buf) !== ext) return res.status(400).json({ error: "O arquivo não é uma imagem válida." });
    const name = `${Date.now().toString(36)}-${crypto.randomBytes(8).toString("hex")}.${ext}`;
    fs.writeFileSync(path.join(uploadsDir, name), buf);
    res.status(201).json({ url: `/uploads/${name}` });
  } catch (e) { next(e); }
});

export default r;
