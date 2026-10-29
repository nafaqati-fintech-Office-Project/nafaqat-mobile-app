import { describe, expect, it } from 'vitest';

import { lastChargeDate, readDay } from './chargeDate';
import { mockSubscriptions } from './mock';
import { fromMinor, monthlyCostOf, needsAttention, pickCurrency, toMinor, viewOf } from './subscriptionMath';
import type { Subscription, SubscriptionsData } from './types';

const sub = (overrides: Partial<Subscription>): Subscription => ({
  id: 'x',
  name: 'X',
  amount: '10.00',
  currency: 'SAR',
  cycle: 'MONTHLY',
  status: 'CONFIRMED',
  source: 'DETECTED',
  lastChargeDate: new Date(2026, 9, 5),
  nextDate: new Date(2026, 10, 5),
  previousAmount: null,
  monthlyCost: '10.00',
  overdue: false,
  ...overrides,
});

const data = (items: Subscription[], extra: Partial<SubscriptionsData> = {}): SubscriptionsData => ({
  items,
  totals: [],
  upcoming: [],
  syncStatus: 'DONE',
  ...extra,
});

describe('money helpers', () => {
  it('converts to and from minor units without float drift', () => {
    expect(toMinor('24.99', 'SAR')).toBe(2499);
    expect(toMinor('1.5', 'KWD')).toBe(1500);
    expect(fromMinor(2499, 'SAR')).toBe('24.99');
    expect(monthlyCostOf('120.00', 'YEARLY', 'SAR')).toBe('10.00');
    expect(monthlyCostOf('30.00', 'QUARTERLY', 'SAR')).toBe('10.00');
    expect(monthlyCostOf('3.00', 'WEEKLY', 'SAR')).toBe('13.00');
  });
});

describe('viewOf', () => {
  it('splits review, active and ended, and uses the service totals', () => {
    const view = viewOf(
      data(
        [
          sub({ id: 'd', status: 'DETECTED' }),
          sub({ id: 'late', nextDate: new Date(2026, 10, 9) }),
          sub({ id: 'soon', nextDate: new Date(2026, 10, 2), previousAmount: '8.00' }),
          sub({ id: 'e1', status: 'ENDED', lastChargeDate: new Date(2026, 5, 1) }),
          sub({ id: 'e2', status: 'ENDED', lastChargeDate: new Date(2026, 8, 1) }),
        ],
        {
          totals: [{ currency: 'SAR', monthlyTotal: '20.00', yearlyTotal: '240.00', activeCount: 2 }],
          upcoming: [
            { id: 'soon', name: 'X', amount: '10.00', currency: 'SAR', date: new Date(2026, 10, 2) },
            { id: 'k', name: 'K', amount: '3.000', currency: 'KWD', date: new Date(2026, 10, 3) },
          ],
        },
      ),
      'SAR',
    );
    expect(view.review.map((s) => s.id)).toEqual(['d']);
    expect(view.active.map((s) => s.id)).toEqual(['soon', 'late']); // next charge first
    expect(view.ended.map((s) => s.id)).toEqual(['e2', 'e1']); // most recent first
    expect(view.perMonth).toBe('20.00');
    expect(view.dueSoon).toEqual({ total: '10.00', count: 1 }); // KWD left out
    expect(view.attention.map((s) => s.id)).toEqual(['soon']);
  });

  it('needs attention when overdue or the price went up, not when it went down', () => {
    expect(needsAttention(sub({ overdue: true }))).toBe(true);
    expect(needsAttention(sub({ previousAmount: '9.99' }))).toBe(true);
    expect(needsAttention(sub({ previousAmount: '12.00' }))).toBe(false);
  });

  it('shows the preferred currency, else the one with the highest monthly total', () => {
    const items = [sub({ currency: 'SAR' }), sub({ id: 'p', currency: 'PKR' })];
    const totals = [
      { currency: 'SAR', monthlyTotal: '10.00', yearlyTotal: '120.00', activeCount: 1 },
      { currency: 'PKR', monthlyTotal: '5000.00', yearlyTotal: '60000.00', activeCount: 1 },
    ];
    expect(pickCurrency(data(items, { totals }), 'SAR')).toBe('SAR');
    expect(pickCurrency(data(items, { totals }), 'AED')).toBe('PKR');
    expect(pickCurrency(data([]), null)).toBe('SAR');
  });

  it('gives the bypass sample one to review, six active and one ended', () => {
    const view = viewOf(data(mockSubscriptions()), null);
    expect([view.review.length, view.active.length, view.ended.length]).toEqual([1, 6, 1]);
    expect(view.attention.map((s) => s.name).sort()).toEqual(['Spotify', 'YouTube Premium']);
  });
});

describe('charge day', () => {
  it('picks the most recent date on that day of the month', () => {
    expect(lastChargeDate(14, new Date(2026, 9, 29))).toBe('2026-10-14');
    expect(lastChargeDate(30, new Date(2026, 9, 29))).toBe('2026-09-30');
    expect(lastChargeDate(31, new Date(2026, 9, 29))).toBe('2026-09-30'); // September has 30 days
    expect(lastChargeDate(5, new Date(2026, 0, 2))).toBe('2025-12-05');
  });

  it('reads a day from 1 to 31, Arabic digits too', () => {
    expect(readDay('14')).toBe(14);
    expect(readDay('١٤')).toBe(14);
    for (const text of ['0', '32', '', '1.5', 'x']) expect(readDay(text), text).toBeNull();
  });
});
