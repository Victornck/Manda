import crypto from "node:crypto";

// Alfabeto SEM caracteres que se confundem na leitura: sairam 0/O, 1/l/I.
// Quem recebe o link num print, dita por telefone ou digita na mao nao tem como
// errar entre eles. Sobram 57 simbolos: 57^12 ~ 1,2 x 10^21 combinacoes
// (~70 bits), o que continua inviavel de adivinhar ou colidir.
//
// Vale so para IDs NOVOS. Os links ja distribuidos continuam validos: a busca
// e por igualdade exata na coluna public_id, que nao depende do alfabeto.
export const PUBLIC_ID_ALPHABET = "23456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";

// ID publico curto e imprevisivel para os links de proposta. Usa amostragem por
// rejeicao: descartar os bytes >= 228 (maior multiplo de 57 que cabe em um
// byte) evita o vies do "byte % tamanho", que favoreceria os primeiros simbolos.
export function publicId(len = 12) {
  const A = PUBLIC_ID_ALPHABET;
  const limit = 256 - (256 % A.length);
  let out = "";
  while (out.length < len) {
    const bytes = crypto.randomBytes(len * 2);
    for (let i = 0; i < bytes.length && out.length < len; i++) {
      if (bytes[i] < limit) out += A[bytes[i] % A.length];
    }
  }
  return out;
}
