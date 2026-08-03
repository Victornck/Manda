// Fonte única de verdade das moedas suportadas. Para adicionar uma moeda no
// futuro, basta acrescentar UMA entrada aqui — nada de moeda hardcoded espalhada
// pelo código. `locale` define o padrão de formatação (Intl.NumberFormat).
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

export const currencyList = () => Object.values(CURRENCIES);
export const isCurrency = (c) => typeof c === "string" && Object.prototype.hasOwnProperty.call(CURRENCIES, c);
export const normalizeCurrency = (c) => (isCurrency(c) ? c : DEFAULT_CURRENCY);
export const currencyCodes = () => Object.keys(CURRENCIES);
