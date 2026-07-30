import { Router } from "express";
import { z } from "zod";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { requireAuth } from "../middleware/auth.js";
import { writeLimiter } from "../middleware/rateLimit.js";
import { uploadsDir } from "../lib/uploads.js";

const r = Router();

// Recebe a imagem como data URL (o front já comprime antes), grava no disco e
// devolve uma URL curta. Assim o banco guarda só o link, não a imagem em base64.
const schema = z.object({
  image: z.string().startsWith("data:image/").max(3_600_000),
});

const EXT = { jpeg: "jpg", "svg+xml": "svg" };

r.post("/image", requireAuth, writeLimiter, (req, res, next) => {
  try {
    const { image } = schema.parse(req.body);
    const m = /^data:image\/([a-z.+-]+);base64,(.+)$/i.exec(image);
    if (!m) return res.status(400).json({ error: "Imagem inválida." });
    const sub = m[1].toLowerCase();
    const ext = EXT[sub] || sub;
    const buf = Buffer.from(m[2], "base64");
    if (buf.length > 2.6 * 1024 * 1024) return res.status(413).json({ error: "Imagem grande demais (máx. 2 MB)." });
    const name = `${Date.now().toString(36)}-${crypto.randomBytes(8).toString("hex")}.${ext}`;
    fs.writeFileSync(path.join(uploadsDir, name), buf);
    res.status(201).json({ url: `/uploads/${name}` });
  } catch (e) { next(e); }
});

export default r;
