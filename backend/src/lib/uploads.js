import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../env.js";

// Pasta no disco onde ficam as imagens enviadas (logo/capa). Fica FORA do dist e
// do controle do git, então sobrevive a git pull e npm run build. O padrão é
// <raiz do projeto>/uploads; em produção dá pra apontar para outro caminho com
// UPLOADS_DIR (ex.: um volume dedicado).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadsDir = env.UPLOADS_DIR || path.resolve(__dirname, "../../../uploads");

try {
  fs.mkdirSync(uploadsDir, { recursive: true });
} catch (e) {
  console.error("[uploads] não foi possível criar a pasta:", e.message);
}
