import { api } from '@/api/client';

// Credits for Free users (billing-service decides everything; the app only shows it). A rewarded ad earns credits and
// credits unlock a Premium feature for a while.
export type CreditFeature = 'report_export' | 'insights';

export type CreditSummary = {
  balance: number;
  adsWatchedToday: number;
  dailyAdLimit: number;
  creditsPerAd: number;
  maxBalance: number;
  features: { feature: string; cost: number; unlockMinutes: number }[];
  unlocks: { feature: string; expiresAt: string }[];
};

const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

function parse(data: unknown): CreditSummary {
  const b = (data ?? {}) as Record<string, unknown>;
  const list = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);
  return {
    balance: num(b.balance),
    adsWatchedToday: num(b.adsWatchedToday),
    dailyAdLimit: num(b.dailyAdLimit),
    creditsPerAd: num(b.creditsPerAd, 1),
    maxBalance: num(b.maxBalance),
    features: list(b.features).flatMap((f) =>
      typeof f.feature === 'string' ? [{ feature: f.feature, cost: num(f.cost), unlockMinutes: num(f.unlockMinutes) }] : [],
    ),
    unlocks: list(b.unlocks).flatMap((u) =>
      typeof u.feature === 'string' && typeof u.expiresAt === 'string' ? [{ feature: u.feature, expiresAt: u.expiresAt }] : [],
    ),
  };
}

const newKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

export async function getCredits(): Promise<CreditSummary> {
  const { data } = await api.get<unknown>('/api/billing/credits');
  return parse(data);
}

// Pays for a feature. A retry with the same key never charges twice; pass the key you used the first time.
export async function spendCredits(feature: CreditFeature, key: string = newKey()): Promise<{ charged: boolean; balance: number }> {
  const { data } = await api.post<{ charged?: boolean; balance?: number }>(
    '/api/billing/credits/spend',
    { feature },
    { headers: { 'Idempotency-Key': key } },
  );
  return { charged: data.charged === true, balance: num(data.balance) };
}

// Development only: the server accepts this only when CREDITS_MOCK_REWARDS is on. Real rewards are credited by the ad
// network's server callback, never by the app.
export async function claimMockReward(): Promise<CreditSummary> {
  const { data } = await api.post<unknown>('/api/billing/credits/mock-reward', { transactionId: `mock-${newKey()}` });
  return parse(data);
}

export const costOf = (summary: CreditSummary | null, feature: CreditFeature): number =>
  summary?.features.find((f) => f.feature === feature)?.cost ?? 0;
