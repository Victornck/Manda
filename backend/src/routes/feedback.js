import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";
import { env } from "../env.js";
import { verifyToken } from "../lib/jwt.js";
import { feedbackLimiter } from "../middleware/rateLimit.js";

// Auth OPCIONAL: se vier um token válido, identifica a conta (contexto extra pro
// suporte). Sem token, segue como público — o rodapé da landing usa isso. O
// abuso é contido pelo feedbackLimiter (por IP) e pela exigência de e-mail.
function optionalAuth(req, _res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (token) { try { req.user = { id: verifyToken(token).sub }; } catch { /* público */ } }
  next();
}
import { sendMail, feedbackEmailHtml, feedbackEmailText, FEEDBACK_LABELS } from "../lib/mailer.js";

const r = Router();

const schema = z.object({
  category: z.enum(["bug", "sugestao", "duvida", "cobranca", "outro"]),
  message: z.string().trim().min(3, "Escreva um pouco mais.").max(2000),
  email: z.union([z.string().trim().email(), z.literal("")]).optional(),
  pageUrl: z.string().trim().max(300).optional(),
  // Print opcional: data URL de imagem, até ~1.9MB em base64 (o front comprime).
  screenshot: z.string().startsWith("data:image/").max(2_600_000).optional(),
});

// Converte o data URL do print num anexo de e-mail. Retorna null se não bater.
function toAttachment(dataUrl) {
  const m = /^data:(image\/[a-z.+-]+);base64,(.+)$/i.exec(dataUrl || "");
  if (!m) return null;
  const ext = m[1].split("/")[1].replace("+xml", "").replace("jpeg", "jpg");
  return { filename: `print.${ext}`, content: Buffer.from(m[2], "base64"), contentType: m[1] };
}

// POST /api/feedback — "Relatar problema". Salva no banco e avisa o suporte por e-mail.
r.post("/", optionalAuth, feedbackLimiter, async (req, res, next) => {
  try {
    const data = schema.parse(req.body);

    // Logado: puxa o contexto da conta. Público (rodapé): exige o e-mail informado.
    let acc = {};
    if (req.user) {
      const { rows } = await query("select email, name from users where id=$1", [req.user.id]);
      acc = rows[0] || {};
    } else if (!data.email) {
      return res.status(400).json({ error: "Informe seu e-mail para o suporte responder." });
    }
    const fromEmail = data.email || acc.email || "";
    const shot = data.screenshot || null;

    // Sem tabela: o relato vai só por e-mail pro suporte, com o print anexado.
    const to = env.SMTP_USER || env.EMAIL_FROM;
    const dateStr = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const att = shot ? toAttachment(shot) : null;
    const payload = {
      category: data.category, message: data.message, fromEmail, fromName: acc.name,
      pageUrl: data.pageUrl, hasShot: Boolean(att), dateStr,
    };
    await sendMail({
      to,
      subject: `[Manda] ${FEEDBACK_LABELS[data.category] || "Relato"} de ${fromEmail || "usuário"}`,
      html: feedbackEmailHtml(payload),
      text: feedbackEmailText(payload),
      replyTo: fromEmail || undefined,
      attachments: att ? [att] : undefined,
    });

    res.status(201).json({ ok: true });
  } catch (e) { next(e); }
});

export default r;
