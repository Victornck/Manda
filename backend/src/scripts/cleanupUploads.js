import fs from "node:fs";
import path from "node:path";
import { query } from "../db.js";
import { uploadsDir } from "../lib/uploads.js";

// Apaga do disco as imagens que NENHUMA proposta referencia (órfãs). Órfãs surgem
// quando alguém sobe um logo/capa e nunca conclui a proposta, ou quando a proposta
// é apagada. É seguro: só remove arquivos mais velhos que a carência, para nunca
// pegar um upload em andamento que ainda não foi salvo numa proposta.
//
// Uso (dentro de backend/):
//   node src/scripts/cleanupUploads.js            -> apaga de verdade
//   node src/scripts/cleanupUploads.js --dry-run  -> só mostra o que apagaria

const DRY_RUN = process.argv.includes("--dry-run");
const GRACE_MS = 24 * 60 * 60 * 1000; // 24h: não mexe em upload recente

// Extrai o nome do arquivo de uma URL tipo "/uploads/abc123.jpg".
function nameFromUrl(u) {
  const m = /\/uploads\/([^/?#]+)$/.exec(String(u || ""));
  return m ? m[1] : null;
}

async function main() {
  // 1. Nomes de arquivo em uso (logo e capa de qualquer proposta).
  const { rows } = await query(
    "select logo, cover from proposals where coalesce(logo,'') <> '' or coalesce(cover,'') <> ''"
  );
  const referenced = new Set();
  for (const r of rows) {
    for (const v of [r.logo, r.cover]) {
      const n = nameFromUrl(v);
      if (n) referenced.add(n);
    }
  }

  // 2. Arquivos no disco.
  let files = [];
  try { files = fs.readdirSync(uploadsDir); } catch { files = []; }

  const now = Date.now();
  let kept = 0, tooNew = 0, deleted = 0, freed = 0;

  for (const name of files) {
    const full = path.join(uploadsDir, name);
    let st;
    try { st = fs.statSync(full); } catch { continue; }
    if (!st.isFile()) continue;

    if (referenced.has(name)) { kept++; continue; }            // em uso
    if (now - st.mtimeMs < GRACE_MS) { tooNew++; continue; }    // upload recente

    if (DRY_RUN) console.log("[órfã]", name, `(${(st.size / 1024).toFixed(0)} KB)`);
    else {
      try { fs.unlinkSync(full); } catch (e) { console.error("falha ao apagar", name, e.message); continue; }
    }
    deleted++; freed += st.size;
  }

  console.log(`\n${DRY_RUN ? "[DRY-RUN] " : ""}Limpeza de uploads (${uploadsDir}):`);
  console.log(`  em uso (mantidas):                 ${kept}`);
  console.log(`  recentes < 24h (mantidas):         ${tooNew}`);
  console.log(`  órfãs ${DRY_RUN ? "que seriam apagadas" : "apagadas"}:  ${deleted}  (${(freed / 1024 / 1024).toFixed(2)} MB)`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error("[cleanupUploads] erro:", e); process.exit(1); });
