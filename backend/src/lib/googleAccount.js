import { query } from "../db.js";
import { seal, open } from "./secretbox.js";
import { refreshAccessToken } from "./googleMail.js";

// Persistência da conexão de Gmail do usuário. O refresh_token vive cifrado
// (secretbox). O access_token é cache: se estiver perto de expirar, renova.

export async function getAccount(userId) {
  const { rows } = await query("select * from google_email_accounts where user_id=$1", [userId]);
  return rows[0] || null;
}

export async function saveAccount(userId, { email, refreshToken, accessToken, expiresIn, scope }) {
  const expires = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;
  await query(
    `insert into google_email_accounts (user_id, email, refresh_token_enc, access_token, access_expires_at, scope, updated_at)
     values ($1,$2,$3,$4,$5,$6, now())
     on conflict (user_id) do update set
       email=excluded.email,
       refresh_token_enc=excluded.refresh_token_enc,
       access_token=excluded.access_token,
       access_expires_at=excluded.access_expires_at,
       scope=excluded.scope,
       updated_at=now()`,
    [userId, email, seal(refreshToken), accessToken || null, expires, scope || ""]
  );
}

export async function deleteAccount(userId) {
  await query("delete from google_email_accounts where user_id=$1", [userId]);
}

// Devolve um access_token válido (renova se faltar menos de 2 min). Lança um erro
// com .needsConnect quando não há conexão ou o refresh_token foi revogado.
export async function getFreshAccess(userId) {
  const acc = await getAccount(userId);
  if (!acc) {
    const e = new Error("Conta Google não conectada.");
    e.needsConnect = true;
    throw e;
  }
  const soon = Date.now() + 120_000;
  const valid = acc.access_token && acc.access_expires_at && new Date(acc.access_expires_at).getTime() > soon;
  if (valid) return { email: acc.email, accessToken: acc.access_token };

  const refresh = open(acc.refresh_token_enc);
  if (!refresh) {
    await deleteAccount(userId);
    const e = new Error("Credencial do Gmail corrompida. Reconecte.");
    e.needsConnect = true;
    throw e;
  }
  try {
    const t = await refreshAccessToken(refresh);
    const expires = t.expires_in ? new Date(Date.now() + t.expires_in * 1000) : null;
    await query(
      "update google_email_accounts set access_token=$2, access_expires_at=$3, updated_at=now() where user_id=$1",
      [userId, t.access_token, expires]
    );
    return { email: acc.email, accessToken: t.access_token };
  } catch (err) {
    if (err.revoked) {
      await deleteAccount(userId);
      const e = new Error("Acesso ao Gmail expirou. Reconecte sua conta.");
      e.needsConnect = true;
      throw e;
    }
    throw err;
  }
}
