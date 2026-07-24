import crypto from "node:crypto";
import { env } from "../env.js";

// Proteção de dados sensíveis (CPF) em repouso.
//
// Duas peças, porque uma só não resolve:
//   1) cpf_enc  — AES-256-GCM (reversível): o CPF pode ser lido de volta quando
//      houver necessidade legítima (nota fiscal, KYC, exibir ao titular). Usa IV
//      aleatório, então o mesmo CPF gera cifras diferentes: seguro, mas por isso
//      NÃO serve para achar duplicatas.
//   2) cpf_hash — HMAC-SHA256 (determinístico, "índice cego"): mesmo CPF sempre
//      gera o mesmo hash, então dá para ter UNIQUE (1 conta por CPF) e buscar,
//      sem que o hash revele o número (o segredo fica só no servidor).
//
// As chaves saem do .env. Se não forem definidas, derivam do JWT_SECRET com
// separação de domínio — funciona out-of-the-box, mas o ideal em produção é
// definir CPF_ENC_KEY e CPF_INDEX_KEY próprios (assim vazar o JWT não expõe CPF).

const encKey = crypto.createHash("sha256")
  .update(env.CPF_ENC_KEY || `${env.JWT_SECRET}::cpf-enc`).digest(); // 32 bytes
const idxKey = env.CPF_INDEX_KEY || `${env.JWT_SECRET}::cpf-idx`;

// Cifra os dígitos do CPF. Retorna base64 de [iv(12) | tag(16) | ciphertext].
export function encryptCpf(digits) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", encKey, iv);
  const ct = Buffer.concat([c.update(String(digits), "utf8"), c.final()]);
  const tag = c.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

// Decifra. Retorna os dígitos, ou null se o dado estiver corrompido/adulterado.
export function decryptCpf(blob) {
  try {
    const raw = Buffer.from(String(blob), "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ct = raw.subarray(28);
    const d = crypto.createDecipheriv("aes-256-gcm", encKey, iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(ct), d.final()]).toString("utf8");
  } catch { return null; }
}

// Índice cego para UNIQUE e busca. Determinístico e irreversível.
export function cpfIndex(digits) {
  return crypto.createHmac("sha256", idxKey).update(String(digits)).digest("hex");
}
