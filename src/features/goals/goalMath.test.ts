import { describe, expect, it } from 'vitest';

import { monthsAhead } from './goalForm';
import { can, mainCurrency, monthlyNeeded, monthsLeft, progressOf, remainingOf, totalsOf } from './goalMath';
import type { Goal } from './types';

const goal = (overrides: Partial<Goal> = {}): Goal => ({
  id: 'g',
  name: 'Trip',
  description: null,
  targetAmount: '1000.00',
  savedAmount: '250.00',
  currency: 'SAR',
  targetDate: null,
  status: 'ACTIVE',
  createdAt: new Date(2026, 0, 1),
  ...overrides,
});

const today = new Date(2026, 9, 29);

describe('progress', () => {
  it('works out what is left and the whole percent, never past 100', () => {
    expect(remainingOf(goal())).toBe('750.00');
    expect(progressOf(goal())).toBe(25);
    expect(progressOf(goal({ savedAmount: '999.99' }))).toBe(99);
    expect(progressOf(goal({ savedAmount: '1500.00' }))).toBe(100);
    expect(remainingOf(goal({ savedAmount: '1500.00' }))).toBe('0.00');
  });

  it('keeps three decimals for KWD', () => {
    const kwd = goal({ currency: 'KWD', targetAmount: '10.500', savedAmount: '2.125' });
    expect(remainingOf(kwd)).toBe('8.375');
    expect(progressOf(kwd)).toBe(20);
  });
});

describe('monthly need', () => {
  it('splits what is left over the months to the date, rounding up', () => {
    const inTen = goal({ targetDate: new Date(2027, 7, 29) });
    expect(monthsLeft(inTen, today)).toBe(10);
    expect(monthlyNeeded(inTen, today)).toBe('75.00');
    // 1 March is 4 full months away (the 29th of February does not exist): 1000 / 4.
    expect(monthlyNeeded(goal({ savedAmount: '0.00', targetDate: new Date(2027, 2, 1) }), today)).toBe('250.00');
    // 28 February is a day short of 4 months, so 3: 1000 / 3, rounded up.
    expect(monthlyNeeded(goal({ savedAmount: '0.00', targetDate: new Date(2027, 1, 28) }), today)).toBe('333.34');
  });

  it('counts a date less than a month away as one month', () => {
    expect(monthsLeft(goal({ targetDate: new Date(2026, 10, 5) }), today)).toBe(1);
  });

  it('does not apply without a date, after it, once reached, or when not active', () => {
    expect(monthlyNeeded(goal(), today)).toBeNull();
    expect(monthlyNeeded(goal({ targetDate: new Date(2026, 8, 1) }), today)).toBeNull();
    expect(monthlyNeeded(goal({ savedAmount: '1000.00', targetDate: new Date(2027, 1, 1) }), today)).toBeNull();
    expect(monthlyNeeded(goal({ status: 'COMPLETED', targetDate: new Date(2027, 1, 1) }), today)).toBeNull();
  });
});

describe('what each status allows', () => {
  it('follows the goal service', () => {
    expect(can.complete(goal())).toBe(false);
    expect(can.complete(goal({ savedAmount: '1000.00' }))).toBe(true);
    expect(can.complete(goal({ savedAmount: '1000.00', status: 'COMPLETED' }))).toBe(false);
    expect(can.reopen('COMPLETED')).toBe(true);
    expect(can.reopen('CANCELLED')).toBe(false);
    expect(can.contribute('CANCELLED')).toBe(false);
    expect(can.changeCurrency(goal())).toBe(false);
    expect(can.changeCurrency(goal({ savedAmount: '0.00' }))).toBe(true);
  });
});

describe('totals', () => {
  it('adds up the active goals of one currency', () => {
    const goals = [
      goal({ id: 'a' }),
      goal({ id: 'b', targetAmount: '500.00', savedAmount: '100.50' }),
      goal({ id: 'c', status: 'COMPLETED' }),
      goal({ id: 'd', currency: 'PKR' }),
    ];
    expect(totalsOf(goals, 'SAR')).toEqual({ currency: 'SAR', saved: '350.50', target: '1500.00', activeCount: 2 });
    expect(mainCurrency(goals)).toBe('SAR');
    expect(mainCurrency([])).toBe('SAR');
  });
});

describe('monthsAhead', () => {
  it('keeps the day, or the last day of a shorter month', () => {
    expect(monthsAhead(6, new Date(2026, 9, 29))).toEqual(new Date(2027, 3, 29));
    expect(monthsAhead(4, new Date(2026, 9, 31))).toEqual(new Date(2027, 1, 28));
  });
});
