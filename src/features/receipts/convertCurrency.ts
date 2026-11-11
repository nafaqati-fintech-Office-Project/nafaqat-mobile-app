import { currencyDecimals } from '@/utils/money';

// Units of each currency for 1 US dollar. Used when live rates cannot be fetched (offline, slow). The Gulf
// currencies are pegged, so they hardly move; PKR and the euro and pound are only approximate.
const FALLBACK_PER_USD: Record<string, number> = {
  USD: 1,
  SAR: 3.75,
  AED: 3.6725,
  QAR: 3.64,
  BHD: 0.376,
  OMR: 0.3845,
  KWD: 0.307,
  PKR: 280,
  EUR: 0.92,
  GBP: 0.78,
};

const RATES_URL = 'https://open.er-api.com/v6/latest/USD';
const RATES_TIMEOUT_MS = 4000;

let liveRates: Record<string, number> | null = null;

// Today's rates (free public service, nothing about the person is sent), or null when they are not reachable.
async function fetchLiveRates(): Promise<Record<string, number> | null> {
  if (liveRates) return liveRates;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RATES_TIMEOUT_MS);
  try {
    const response = await fetch(RATES_URL, { signal: controller.signal });
    const body = (await response.json()) as { result?: string; rates?: Record<string, number> };
    if (body.result === 'success' && body.rates) liveRates = body.rates;
  } catch {
    // Offline or slow: the fallback table is used.
  } finally {
    clearTimeout(timer);
  }
  return liveRates;
}

// `amount` in `from`, as the same money in `to`, written with `to`'s decimals. Null when a currency is unknown.
export async function convertAmount(amount: string, from: string, to: string): Promise<string | null> {
  const rates = { ...FALLBACK_PER_USD, ...(await fetchLiveRates()) };
  const fromRate = rates[from];
  const toRate = rates[to];
  const value = Number(amount);
  if (!fromRate || !toRate || !Number.isFinite(value)) return null;
  return ((value / fromRate) * toRate).toFixed(currencyDecimals(to));
}
