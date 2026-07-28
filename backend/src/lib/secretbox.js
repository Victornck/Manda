import crypto from "node:crypto";
import { env } from "../env.js";

// Criptografia simétrica para segredos guardados em repouso (ex.: o refresh_token
// do Gmail de cada usuário). Mesmo esquema do CPF (AES-256-GCM com IV aleatório),
// mas com chave de DOMÍNIO SEPARADO: vazar uma não expõe a outra.
//
// A chave sai de GOOGLE_TOKEN_KEY; se ausente, deriva do JWT_SECRET. Em produção,
// defina GOOGLE_TOKEN_KEY própria:
//   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
const key = crypto.createHash("sha256")
  .update(env.GOOGLE_TOKEN_KEY || `${env.JWT_SECRET}::google-token`).digest(); // 32 bytes

// Cifra uma string. Retorna base64 de [iv(12) | tag(16) | ciphertext].
export function seal(plain) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(String(plain), "utf8"), c.final()]);
  const tag = c.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

// Decifra. Retorna a string, ou null se o dado estiver corrompido/adulterado.
export function open(blob) {
  try {
    const raw = Buffer.from(String(blob), "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ct = raw.subarray(28);
    const d = crypto.createDecipheriv("aes-256-gcm", key, iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(ct), d.final()]).toString("utf8");
  } catch { return null; }
}
