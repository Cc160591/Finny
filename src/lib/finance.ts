// eslint-disable-next-line @typescript-eslint/no-require-imports
const yahooFinance = require("yahoo-finance2").default;

export async function getStockPrice(symbol: string): Promise<number | null> {
  try {
    const quote = await yahooFinance.quote(symbol) as { regularMarketPrice?: number };
    return quote.regularMarketPrice ?? null;
  } catch {
    return null;
  }
}

export async function getCryptoPrice(coinId: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=eur`
    );
    if (!res.ok) return null;
    const data = await res.json() as Record<string, { eur?: number }>;
    return data[coinId]?.eur ?? null;
  } catch {
    return null;
  }
}

const CRYPTO_SYMBOL_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  ADA: "cardano",
  DOT: "polkadot",
  LINK: "chainlink",
  MATIC: "matic-network",
  AVAX: "avalanche-2",
  ATOM: "cosmos",
  XRP: "ripple",
  BNB: "binancecoin",
  DOGE: "dogecoin",
  LTC: "litecoin",
  UNI: "uniswap",
  AAVE: "aave",
};

export async function getAssetPrice(
  symbol: string,
  type: string
): Promise<number | null> {
  if (type === "CRYPTO") {
    const coinId = CRYPTO_SYMBOL_MAP[symbol.toUpperCase()] ?? symbol.toLowerCase();
    return getCryptoPrice(coinId);
  }
  if (type === "CASH") {
    return 1;
  }
  return getStockPrice(symbol);
}
