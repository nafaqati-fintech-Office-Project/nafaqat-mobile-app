import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  confirmSubscription,
  createSubscription,
  dismissSubscription,
  endSubscription,
  fetchSubscriptions,
  parseSubscription,
} from './subscriptionsApi';
import { actionProblem } from './subscriptionsService';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/api/client', () => ({ api: http }));
vi.mock('@/config/flags', () => ({ AUTH_BYPASS: false }));

// A SubscriptionResponse as the subscription service sends it.
const raw = (overrides: Record<string, unknown> = {}) => ({
  id: 'a1',
  merchantKey: 'spotify',
  displayName: 'Spotify',
  amount: 24.99,
  currency: 'SAR',
  cycle: 'MONTHLY',
  status: 'CONFIRMED',
  source: 'DETECTED',
  confidence: 0.92,
  firstChargeDate: '2025-01-06',
  lastChargeDate: '2026-10-06',
  nextExpectedDate: '2026-11-06',
  occurrenceCount: 22,
  previousAmount: 21.99,
  priceChangedAt: '2026-08-06',
  monthlyCost: 24.99,
  yearlyCost: 299.88,
  overdue: false,
  ...overrides,
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe('parseSubscription', () => {
  it('reads what the screen shows', () => {
    expect(parseSubscription(raw())).toEqual({
      id: 'a1',
      name: 'Spotify',
      amount: '24.99',
      currency: 'SAR',
      cycle: 'MONTHLY',
      status: 'CONFIRMED',
      source: 'DETECTED',
      lastChargeDate: new Date(2026, 9, 6),
      nextDate: new Date(2026, 10, 6),
      previousAmount: '21.99',
      monthlyCost: '24.99',
      overdue: false,
    });
  });

  it('accepts missing dates and price history, and drops dismissed ones', () => {
    const parsed = parseSubscription(raw({ nextExpectedDate: null, lastChargeDate: null, previousAmount: null }));
    expect(parsed).toMatchObject({ nextDate: null, lastChargeDate: null, previousAmount: null });
    expect(parseSubscription(raw({ status: 'DISMISSED' }))).toBeNull();
    expect(() => parseSubscription(raw({ cycle: 'DAILY' }))).toThrow();
  });
});

describe('subscription service calls', () => {
  it('loads the list and the summary with a long timeout for the first visit', async () => {
    http.get.mockImplementation(async (url: string) =>
      url.endsWith('/summary')
        ? {
            data: {
              currencies: [{ currency: 'SAR', monthlyTotal: 24.99, yearlyTotal: 299.88, activeCount: 1 }],
              countsByStatus: { DETECTED: 0, CONFIRMED: 1, DISMISSED: 0, ENDED: 0 },
              needsReview: 0,
              upcoming: [{ id: 'a1', displayName: 'Spotify', amount: 24.99, currency: 'SAR', nextExpectedDate: '2026-11-06' }],
              syncStatus: 'DONE',
            },
          }
        : { data: { syncStatus: 'IN_PROGRESS', items: [raw(), raw({ id: 'z', status: 'DISMISSED' })] } },
    );
    const result = await fetchSubscriptions();
    expect(result.items.map((s) => s.id)).toEqual(['a1']);
    expect(result.totals).toEqual([{ currency: 'SAR', monthlyTotal: '24.99', yearlyTotal: '299.88', activeCount: 1 }]);
    expect(result.upcoming[0]).toMatchObject({ name: 'Spotify', date: new Date(2026, 10, 6) });
    expect(result.syncStatus).toBe('IN_PROGRESS');
    expect(http.get).toHaveBeenCalledWith('/api/subscriptions', { timeout: 35_000 });
  });

  it('confirms, dismisses and ends through the service', async () => {
    http.post.mockResolvedValue({ data: raw() });
    await confirmSubscription('a/1');
    await dismissSubscription('a1');
    await endSubscription('a1');
    expect(http.post.mock.calls.map(([url]) => url)).toEqual([
      '/api/subscriptions/a%2F1/confirm',
      '/api/subscriptions/a1/dismiss',
      '/api/subscriptions/a1/end',
    ]);
  });

  it('adds one by hand', async () => {
    http.post.mockResolvedValue({ data: raw({ source: 'MANUAL' }) });
    const body = { displayName: 'Netflix', amount: 55, currency: 'SAR', cycle: 'MONTHLY' as const, startDate: '2026-10-14' };
    expect(await createSubscription(body)).toMatchObject({ source: 'MANUAL' });
    expect(http.post).toHaveBeenCalledWith('/api/subscriptions', body);
  });
});

describe('actionProblem', () => {
  const refused = (status: number, detail: string) =>
    Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, response: { status, data: { detail } } });

  it('tells the refusals apart', () => {
    expect(actionProblem(refused(409, 'A subscription for this merchant and currency already exists'))).toBe('duplicate');
    expect(actionProblem(refused(409, 'Cannot end a subscription that is DETECTED'))).toBe('notAllowed');
    expect(actionProblem(refused(422, 'endDate must not be before the last charge date'))).toBe('notAllowed');
    expect(actionProblem(refused(404, 'Subscription not found'))).toBe('notAllowed');
    expect(actionProblem(Object.assign(new Error('Network Error'), { isAxiosError: true }))).toBe('network');
    expect(actionProblem(refused(500, ''))).toBe('unknown');
  });
});
