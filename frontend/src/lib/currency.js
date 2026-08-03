// Moedas no frontend — espelha o backend (lib/currency.js). Fonte única: para
// adicionar uma moeda, acrescente UMA entrada aqui. `formatMoney` usa o padrão
// de agrupamento do locale e prefixa o símbolo pedido (R$, US$, €, £, C$…).
export const CURRENCIES = {
  BRL: { code: "BRL", name: "Real Brasileiro", symbol: "R$",   locale: "pt-BR", flag: "🇧🇷" },
  USD: { code: "USD", name: "Dólar Americano", symbol: "US$",  locale: "en-US", flag: "🇺🇸" },
  EUR: { code: "EUR", name: "Euro",            symbol: "€",    locale: "de-DE", flag: "🇪🇺" },
  GBP: { code: "GBP", name: "Libra Esterlina", symbol: "£",    locale: "en-GB", flag: "🇬🇧" },
  CAD: { code: "CAD", name: "Dólar Canadense", symbol: "C$",   locale: "en-CA", flag: "🇨🇦" },
  MXN: { code: "MXN", name: "Peso Mexicano",   symbol: "MX$",  locale: "es-MX", flag: "🇲🇽" },
  ARS: { code: "ARS", name: "Peso Argentino",  symbol: "AR$",  locale: "es-AR", flag: "🇦🇷" },
  CLP: { code: "CLP", name: "Peso Chileno",    symbol: "CLP$", locale: "es-CL", flag: "🇨🇱" },
};

export const DEFAULT_CURRENCY = "BRL";
export const CURRENCY_LIST = Object.values(CURRENCIES);

export const currencyOf = (code) => CURRENCIES[code] || CURRENCIES[DEFAULT_CURRENCY];
export const symbolOf = (code) => currencyOf(code).symbol;
export const isCurrency = (code) => Object.prototype.hasOwnProperty.call(CURRENCIES, code);

// Formata um valor inteiro (unidades da moeda, sem centavos, como o app usa) no
// padrão do locale, com o símbolo da marca à frente. Ex.: formatMoney(34400,'USD')
// -> "US$ 34,400"; formatMoney(34400,'BRL') -> "R$ 34.400".
export function formatMoney(value, code = DEFAULT_CURRENCY) {
  const c = currencyOf(code);
  let n;
  try {
    n = new Intl.NumberFormat(c.locale, { maximumFractionDigits: 0 }).format(Math.round(Number(value) || 0));
  } catch {
    n = (Math.round(Number(value) || 0)).toLocaleString("pt-BR");
  }
  return `${c.symbol} ${n}`;
}
