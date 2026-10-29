import type {
  BillingCycle,
  CurrencyTotal,
  NewSubscription,
  Subscription,
  SubscriptionStatus,
  SubscriptionsData,
  SyncStatus,
  Upcoming,
} from './types';
import { api } from '@/api/client';
import { arr, decimal, localDate, num, obj, str } from '@/api/parse';

const BASE = '/api/subscriptions';
// The first list of a user makes the service read up to 800 days of transactions (the gateway allows 30 s).
const FIRST_LOAD_TIMEOUT_MS = 35_000;

const CYCLES: BillingCycle[] = ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];
const STATUSES: SubscriptionStatus[] = ['DETECTED', 'CONFIRMED', 'ENDED'];
const SYNC: SyncStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'DONE', 'FAILED'];

const optionalDate = (value: unknown) => (value === null || value === undefined ? null : localDate(value));
const optionalAmount = (value: unknown) => (value === null || value === undefined ? null : decimal(value));

function pick<T extends string>(allowed: T[], value: unknown): T {
  const found = allowed.find((item) => item === value);
  if (!found) throw new Error('Unexpected value in response');
  return found;
}

// null for a status the screen does not list (DISMISSED).
export function parseSubscription(raw: unknown): Subscription | null {
  const body = obj(raw);
  if (!STATUSES.includes(body.status as SubscriptionStatus)) return null;
  return {
    id: str(body.id),
    name: str(body.displayName),
    amount: decimal(body.amount),
    currency: str(body.currency),
    cycle: pick(CYCLES, body.cycle),
    status: body.status as SubscriptionStatus,
    source: body.source === 'MANUAL' ? 'MANUAL' : 'DETECTED',
    lastChargeDate: optionalDate(body.lastChargeDate),
    nextDate: optionalDate(body.nextExpectedDate),
    previousAmount: optionalAmount(body.previousAmount),
    monthlyCost: decimal(body.monthlyCost),
    overdue: body.overdue === true,
  };
}

const syncOf = (value: unknown): SyncStatus => SYNC.find((s) => s === value) ?? 'DONE';

// The list (everything but DISMISSED) and the summary, together.
export async function fetchSubscriptions(): Promise<SubscriptionsData> {
  const [list, summary] = await Promise.all([
    api.get<unknown>(BASE, { timeout: FIRST_LOAD_TIMEOUT_MS }),
    api.get<unknown>(`${BASE}/summary`, { timeout: FIRST_LOAD_TIMEOUT_MS }),
  ]);
  const listBody = obj(list.data);
  const summaryBody = obj(summary.data);
  return {
    items: arr(listBody.items)
      .map(parseSubscription)
      .filter((s): s is Subscription => s !== null),
    totals: arr(summaryBody.currencies)
      .map(obj)
      .map(
        (c): CurrencyTotal => ({
          currency: str(c.currency),
          monthlyTotal: decimal(c.monthlyTotal),
          yearlyTotal: decimal(c.yearlyTotal),
          activeCount: num(c.activeCount),
        }),
      ),
    upcoming: arr(summaryBody.upcoming ?? [])
      .map(obj)
      .map(
        (u): Upcoming => ({
          id: str(u.id),
          name: str(u.displayName),
          amount: decimal(u.amount),
          currency: str(u.currency),
          date: localDate(u.nextExpectedDate),
        }),
      ),
    syncStatus: syncOf(listBody.syncStatus ?? summaryBody.syncStatus),
  };
}

// Each action returns the subscription as it is now.
async function act(id: string, action: 'confirm' | 'dismiss' | 'end'): Promise<Subscription | null> {
  const { data } = await api.post<unknown>(`${BASE}/${encodeURIComponent(id)}/${action}`);
  return parseSubscription(data);
}

export const confirmSubscription = (id: string) => act(id, 'confirm');
export const dismissSubscription = (id: string) => act(id, 'dismiss');
// Ends it today (the service's default date).
export const endSubscription = (id: string) => act(id, 'end');

export async function createSubscription(body: NewSubscription): Promise<Subscription | null> {
  const { data } = await api.post<unknown>(BASE, body);
  return parseSubscription(data);
}
