import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { currencyList, DEFAULT_CURRENCY } from "../lib/currency.js";
import { getRates } from "../lib/rates.js";

const r = Router();

// Lista de moedas suportadas (pública: não tem nada sensível). O front usa para
// montar os seletores sem hardcodar a lista.
r.get("/currencies", (_req, res) => {
  res.json({ currencies: currencyList(), default: DEFAULT_CURRENCY });
});

// Cotações atuais (exige login). base opcional (padrão BRL). Devolve também
// updatedAt e stale, para o front avisar quando a cotação está velha.
r.get("/rates", requireAuth, async (req, res, next) => {
  try {
    const { base, rates, updatedAt, stale } = await getRates(req.query.base || DEFAULT_CURRENCY);
    res.json({ base, rates, updatedAt, stale });
  } catch (e) { next(e); }
});

export default r;
