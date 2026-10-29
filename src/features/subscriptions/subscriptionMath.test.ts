import { describe, expect, it } from 'vitest';

import { mockSubscriptions } from './mock';
import { monthlyMinor, summarize } from './subscriptionMath';
import type { Subscription } from './types';

const sub = (overrides: Partial<Subscription>): Subscription => ({
  id: 'x',
  name: 'X',
  category: 'Subscriptions',
  amount: '10.00',
  currency: 'SAR',
  cycle: 'MONTHLY',
  status: 'active',
  date: new Date(2026, 10, 5),
  unused: false,
  tone: 'blue',
  ...overrides,
});

describe('monthlyMinor', () => {
  it('turns any cycle into a monthly cost in minor units', () => {
    expect(monthlyMinor(sub({ amount: '24.99' }))).toBe(2499);
    expect(monthlyMinor(sub({ amount: '120.00', cycle: 'YEARLY' }))).toBe(1000);
    expect(monthlyMinor(sub({ amount: '3.00', cycle: 'WEEKLY' }))).toBe(1300);
  });
});

describe('summarize', () => {
  it('adds up the active ones per month and what dropping the unused ones would save', () => {
    const summary = summarize(
      [
        sub({ id: 'a', amount: '55.00', date: new Date(2026, 10, 9) }),
        sub({ id: 'b', amount: '39.00', unused: true, date: new Date(2026, 10, 2) }),
        sub({ id: 'c', amount: '99.00', status: 'cancelled' }),
      ],
      'SAR',
    );
    expect(summary.perMonth).toBe('94.00');
    expect(summary.unusedPerMonth).toBe('39.00');
    expect(summary.potentialYearly).toBe('468.00');
    expect(summary.active.map((s) => s.id)).toEqual(['b', 'a']); // next charge first
    expect(summary.cancelled.map((s) => s.id)).toEqual(['c']);
    expect(summary.biggest?.id).toBe('a');
  });

  it('never mixes currencies', () => {
    const summary = summarize([sub({ amount: '10.00' }), sub({ id: 'k', amount: '5.000', currency: 'KWD' })], 'SAR');
    expect(summary.perMonth).toBe('10.00');
    expect(summary.active).toHaveLength(1);
  });

  it('gives the sample screen consistent numbers', () => {
    const summary = summarize(mockSubscriptions, 'SAR');
    expect(summary.active).toHaveLength(6);
    expect(summary.cancelled).toHaveLength(2);
    expect(summary.perMonth).toBe('251.98');
    expect(summary.potentialYearly).toBe('1656.00');
  });
});
