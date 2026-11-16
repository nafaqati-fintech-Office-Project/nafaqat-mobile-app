import { api } from '@/api/client';

// The server decides what the user may do (billing-service). Every value is on/off, a number (a limit) or 'unlimited'.
export type EntitlementValue = boolean | number | 'unlimited';
export type Entitlements = Record<string, EntitlementValue>;

export type Me = {
  plan: 'free' | 'premium';
  status: string; // FREE, ACTIVE, PAST_DUE or EXPIRED
  premium: boolean;
  entitlements: Entitlements;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export type PlanPrice = { interval: 'MONTHLY' | 'YEARLY'; currency: string; amount: number };

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);

function parseMe(data: unknown): Me {
  const body = (data ?? {}) as Record<string, unknown>;
  const raw = (body.entitlements ?? {}) as Record<string, unknown>;
  const entitlements: Entitlements = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'boolean' || typeof value === 'number' || value === 'unlimited') entitlements[key] = value;
  }
  return {
    plan: body.plan === 'premium' ? 'premium' : 'free',
    status: str(body.status, 'FREE'),
    premium: body.premium === true,
    entitlements,
    periodEnd: typeof body.periodEnd === 'string' ? body.periodEnd : null,
    cancelAtPeriodEnd: body.cancelAtPeriodEnd === true,
  };
}

export async function getMe(): Promise<Me> {
  const { data } = await api.get<unknown>('/api/billing/me');
  return parseMe(data);
}

export async function getPremiumPrices(): Promise<PlanPrice[]> {
  const { data } = await api.get<unknown>('/api/billing/plans');
  const premium = (Array.isArray(data) ? data : []).find((p) => (p as { id?: unknown }).id === 'premium') as
    | { prices?: { interval?: string; currency?: string; amount?: number }[] }
    | undefined;
  return (premium?.prices ?? []).flatMap((p) =>
    (p.interval === 'MONTHLY' || p.interval === 'YEARLY') && typeof p.currency === 'string' && typeof p.amount === 'number'
      ? [{ interval: p.interval, currency: p.currency, amount: p.amount }]
      : [],
  );
}

// Starts a purchase. Premium begins only when the payment provider confirms it; the app then re-reads getMe().
export async function checkout(interval: 'MONTHLY' | 'YEARLY', currency: string): Promise<{ paymentId: string | null }> {
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  const { data } = await api.post<{ payment?: { id?: string } | null }>(
    '/api/billing/checkout',
    { interval, currency },
    { headers: { 'Idempotency-Key': key } },
  );
  return { paymentId: data.payment?.id ?? null };
}

// Development only: the mock payment provider. The server refuses this outside dev (403) and for other users.
export async function completeMockPayment(paymentId: string): Promise<void> {
  await api.post(`/api/billing/mock/payments/${encodeURIComponent(paymentId)}/succeed`);
}

export async function cancelSubscription(): Promise<Me> {
  const { data } = await api.post<unknown>('/api/billing/cancel');
  return parseMe(data);
}

export async function resumeSubscription(): Promise<Me> {
  const { data } = await api.post<unknown>('/api/billing/resume');
  return parseMe(data);
}

// The initial SMS import. Answers which of these message fingerprints the server accepted (never the message text).
export async function claimImport(fingerprints: string[]): Promise<{ accepted: string[]; rejected: number }> {
  const accepted: string[] = [];
  let rejected = 0;
  for (let i = 0; i < fingerprints.length; i += 500) {
    const { data } = await api.post<{ accepted?: string[]; rejected?: number }>('/api/billing/sms-import/claims', {
      fingerprints: fingerprints.slice(i, i + 500),
    });
    accepted.push(...(data.accepted ?? []));
    rejected += data.rejected ?? 0;
  }
  return { accepted, rejected };
}
