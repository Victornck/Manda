// Serviço de câmbio: uma fonte só pra buscar, cachear e converter cotações.
// - Busca em open.er-api.com (grátis, sem chave).
// - Cache em memória (TTL 1h) para não bater na API a cada request.
// - Persiste no banco (exchange_rates) para fallback quando a API está fora.
// - Nunca "zera" valores: se não houver taxa, devolve o valor original.
import { query } from "../db.js";
import { DEFAULT_CURRENCY, normalizeCurrency } from "./currency.js";

const TTL_MS = 60 * 60 * 1000; // 1 hora
const API = (base) => `https://open.er-api.com/v6/latest/${base}`;

// base -> { rates, fetchedAt(ms) }
const mem = new Map();

async function fetchFromApi(base) {
  const res = await fetch(API(base), { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`rates http ${res.status}`);
  const j = await res.json();
  if (j.result !== "success" || !j.rates) throw new Error("payload de câmbio inválido");
  return j.rates;
}

// Devolve { base, rates, updatedAt, stale }. `stale=true` quando a API falhou e
// estamos servindo a última cotação conhecida (memória ou banco).
export async function getRates(baseInput) {
  const base = normalizeCurrency(baseInput);
  const now = Date.now();
  const cached = mem.get(base);
  if (cached && now - cached.fetchedAt < TTL_MS) {
    return { base, rates: cached.rates, updatedAt: new Date(cached.fetchedAt).toISOString(), stale: false };
  }
  try {
    const rates = await fetchFromApi(base);
    mem.set(base, { rates, fetchedAt: now });
    // Persiste pro fallback (não bloqueia a resposta).
    query(
      `insert into exchange_rates (base, rates, fetched_at) values ($1,$2,now())
       on conflict (base) do update set rates=excluded.rates, fetched_at=now()`,
      [base, JSON.stringify(rates)]
    ).catch(() => {});
    return { base, rates, updatedAt: new Date(now).toISOString(), stale: false };
  } catch {
    // Fallback 1: última cotação em memória (mesmo vencida).
    if (cached) return { base, rates: cached.rates, updatedAt: new Date(cached.fetchedAt).toISOString(), stale: true };
    // Fallback 2: banco.
    try {
      const { rows } = await query("select rates, fetched_at from exchange_rates where base=$1", [base]);
      if (rows[0]) {
        const fetchedAt = new Date(rows[0].fetched_at).getTime();
        mem.set(base, { rates: rows[0].rates, fetchedAt });
        return { base, rates: rows[0].rates, updatedAt: new Date(fetchedAt).toISOString(), stale: true };
      }
    } catch { /* ignore */ }
    // Sem nada: identidade (só a própria base). Evita converter errado.
    return { base, rates: { [base]: 1 }, updatedAt: null, stale: true };
  }
}

// Converte `amount` de `from` para `to` usando um mapa de taxas de QUALQUER base.
// rates[X] = quanto de X vale 1 unidade da base. Logo:
//   amount_em_to = (amount / rates[from]) * rates[to]
export function convertWith(rates, amount, from, to) {
  const a = Number(amount) || 0;
  if (!from || !to || from === to) return a;
  const rf = Number(rates?.[from]);
  const rt = Number(rates?.[to]);
  if (!rf || !rt) return a; // sem taxa conhecida: não mexe no valor
  return (a / rf) * rt;
}

export { DEFAULT_CURRENCY };
