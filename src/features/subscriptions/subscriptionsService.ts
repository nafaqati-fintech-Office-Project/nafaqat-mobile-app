import { isAxiosError } from 'axios';

import { mockSubscriptions } from './mock';
import { monthlyCostOf } from './subscriptionMath';
import * as remote from './subscriptionsApi';
import type { NewSubscription, Subscription, SubscriptionsData } from './types';
import { AUTH_BYPASS } from '@/config/flags';

// The bypass session has no token, so the real endpoints would answer 401; it keeps the sample in memory.

const MOCK_DELAY_MS = 400;
const wait = () => new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
let mock: Subscription[] = mockSubscriptions();

// The service's summary, worked out from the sample list.
function mockData(): SubscriptionsData {
  const confirmed = mock.filter((s) => s.status === 'CONFIRMED');
  const currencies = [...new Set(confirmed.map((s) => s.currency))];
  const soon = Date.now() + 30 * 86_400_000;
  return {
    items: mock,
    totals: currencies.map((currency) => {
      const list = confirmed.filter((s) => s.currency === currency);
      const monthly = list.reduce((sum, s) => sum + Number(s.monthlyCost), 0);
      return { currency, monthlyTotal: monthly.toFixed(2), yearlyTotal: (monthly * 12).toFixed(2), activeCount: list.length };
    }),
    upcoming: confirmed
      .filter((s) => s.nextDate && s.nextDate.getTime() >= Date.now() - 86_400_000 && s.nextDate.getTime() <= soon)
      .map((s) => ({ id: s.id, name: s.name, amount: s.amount, currency: s.currency, date: s.nextDate as Date })),
    syncStatus: 'DONE',
  };
}

export async function getSubscriptions(): Promise<SubscriptionsData> {
  if (!AUTH_BYPASS) return remote.fetchSubscriptions();
  await wait();
  return mockData();
}

type Action = 'confirm' | 'dismiss' | 'end';

// The subscription after the action, or null when it is no longer listed (dismissed).
export async function act(id: string, action: Action): Promise<Subscription | null> {
  if (!AUTH_BYPASS) {
    if (action === 'confirm') return remote.confirmSubscription(id);
    if (action === 'dismiss') return remote.dismissSubscription(id);
    return remote.endSubscription(id);
  }
  await wait();
  if (action === 'dismiss') {
    mock = mock.filter((s) => s.id !== id);
    return null;
  }
  mock = mock.map((s) =>
    s.id !== id ? s : action === 'confirm' ? { ...s, status: 'CONFIRMED' } : { ...s, status: 'ENDED', nextDate: null },
  );
  return mock.find((s) => s.id === id) ?? null;
}

export async function addSubscription(body: NewSubscription): Promise<Subscription | null> {
  if (!AUTH_BYPASS) return remote.createSubscription(body);
  await wait();
  if (mock.some((s) => s.name.toLowerCase() === body.displayName.toLowerCase() && s.currency === body.currency)) {
    const detail = 'A subscription for this merchant and currency already exists';
    throw Object.assign(new Error('Duplicate'), { isAxiosError: true, response: { status: 409, data: { detail } } });
  }
  const [y, m, d] = body.startDate.split('-').map(Number);
  const added: Subscription = {
    id: `m${Date.now()}`,
    name: body.displayName,
    amount: body.amount.toFixed(2),
    currency: body.currency,
    cycle: body.cycle,
    status: 'CONFIRMED',
    source: 'MANUAL',
    lastChargeDate: new Date(y, m - 1, d),
    nextDate: null,
    previousAmount: null,
    monthlyCost: monthlyCostOf(body.amount.toFixed(2), body.cycle, body.currency),
    overdue: false,
  };
  mock = [...mock, added];
  return added;
}

export type ActionProblem = 'duplicate' | 'notAllowed' | 'network' | 'unknown';

// What went wrong, from the service's answer (ProblemDetail: status, title, detail).
export function actionProblem(error: unknown): ActionProblem {
  if (!isAxiosError(error)) return 'unknown';
  const status = error.response?.status;
  if (status === undefined) return 'network';
  const data: unknown = error.response?.data;
  const detail =
    typeof data === 'object' && data !== null && 'detail' in data && typeof data.detail === 'string'
      ? data.detail.toLowerCase()
      : '';
  if (status === 409 && detail.includes('already exists')) return 'duplicate';
  // 404: it is gone (dismissed on another device, for example).
  if (status === 404 || status === 409 || status === 422) return 'notAllowed';
  return 'unknown';
}
