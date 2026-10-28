import { describe, expect, it } from 'vitest';

import {
  buildDashboard,
  changePercent,
  monthRange,
  pickCurrency,
  previousMonth,
  todayIn,
  weekDates,
  type BuildInput,
} from './dashboardBuilder';

const money = (currency: string, totalExpenses: number, totalIncome = 0) => ({
  currency,
  totalExpenses,
  totalIncome,
  net: totalIncome - totalExpenses,
});

const base: BuildInput = {
  period: { year: 2026, month: 10 },
  preferredCurrency: 'PKR',
  current: [money('PKR', 4250, 12000)],
  previous: [money('PKR', 5000)],
  summary: [{ currency: 'PKR', totalSpent: 4250, transactionCount: 12 }],
  daily: [
    {
      currency: 'PKR',
      days: [
        { date: '2026-10-26', total: 100.5 },
        { date: '2026-10-28', total: 300 },
      ],
    },
  ],
  week: weekDates({ year: 2026, month: 10, day: 27 }),
  budget: { state: 'ready', percent: 64.6 },
  subscriptions: { state: 'ready', count: 3 },
};

describe('dates', () => {
  it('gives the Monday-to-Sunday week that contains today', () => {
    expect(weekDates({ year: 2026, month: 10, day: 27 })).toEqual([
      '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01',
    ]);
    // A Sunday belongs to the week that started the Monday before.
    expect(weekDates({ year: 2026, month: 11, day: 1 })[0]).toBe('2026-10-26');
  });

  it('gives month ranges, including February and the year boundary', () => {
    expect(monthRange(2026, 10)).toEqual({ startDate: '2026-10-01', endDate: '2026-10-31' });
    expect(monthRange(2028, 2).endDate).toBe('2028-02-29');
    expect(previousMonth(2026, 1)).toEqual({ year: 2025, month: 12 });
    expect(previousMonth(2026, 10)).toEqual({ year: 2026, month: 9 });
  });

  it('reads today in the user zone, not the phone zone', () => {
    const instant = new Date('2026-10-27T22:30:00Z'); // already 28 Oct in Karachi (UTC+5)
    expect(todayIn('Asia/Karachi', instant)).toEqual({ year: 2026, month: 10, day: 28 });
    expect(todayIn('UTC', instant)).toEqual({ year: 2026, month: 10, day: 27 });
    expect(todayIn('Not/AZone', instant)).toEqual({ year: 2026, month: 10, day: 27 });
  });
});

describe('pickCurrency', () => {
  it('prefers the user currency when the reports have it', () => {
    expect(pickCurrency('PKR', [money('SAR', 900), money('PKR', 10)], [])).toBe('PKR');
  });

  it('falls back to the currency with the most spending', () => {
    expect(pickCurrency('USD', [money('SAR', 900), money('PKR', 10)], [])).toBe('SAR');
  });

  it('uses the preference, then PKR, when there is no data', () => {
    expect(pickCurrency('AED', [], [])).toBe('AED');
    expect(pickCurrency(null, [], [])).toBe('PKR');
  });
});

describe('changePercent', () => {
  it('is signed and rounded to one decimal', () => {
    expect(changePercent(4250, 5000)).toBe(-15);
    expect(changePercent(5500, 5000)).toBe(10);
    expect(changePercent(1, 3)).toBe(-66.7);
  });

  it('is 0 when last month had no spending', () => {
    expect(changePercent(4250, 0)).toBe(0);
  });
});

describe('buildDashboard', () => {
  it('maps the report numbers into the dashboard shape', () => {
    const data = buildDashboard(base);
    expect(data).toMatchObject({
      period: { year: 2026, month: 10 },
      currency: 'PKR',
      totalSpending: '4250.00',
      changePercent: -15,
      transactionCount: 12,
      budgetUsedPercent: 65,
      budgetState: 'ready',
      activeSubscriptions: 3,
      subscriptionsState: 'ready',
      savings: '7750.00',
    });
  });

  it('puts each day into its weekday slot and fills the rest with zero', () => {
    const { weekly } = buildDashboard(base);
    expect(weekly).toHaveLength(7);
    expect(weekly[0]).toEqual({ day: 0, amount: '100.50' }); // Monday 26 Oct
    expect(weekly[2]).toEqual({ day: 2, amount: '300.00' }); // Wednesday 28 Oct
    expect(weekly[1].amount).toBe('0.00');
    expect(weekly[6].amount).toBe('0.00');
  });

  it('uses three decimals for KWD', () => {
    const data = buildDashboard({
      ...base,
      preferredCurrency: 'KWD',
      current: [money('KWD', 12.5, 20)],
      previous: [],
      summary: [],
      daily: [],
    });
    expect(data.totalSpending).toBe('12.500');
    expect(data.savings).toBe('7.500');
  });

  it('shows zeros for a user with no transactions yet', () => {
    const data = buildDashboard({ ...base, current: [], previous: [], summary: [], daily: [] });
    expect(data).toMatchObject({
      currency: 'PKR',
      totalSpending: '0.00',
      changePercent: 0,
      transactionCount: 0,
      savings: '0.00',
    });
    expect(data.weekly.every((w) => w.amount === '0.00')).toBe(true);
  });

  it('keeps "no budget" (null) apart from an unavailable budget', () => {
    expect(buildDashboard({ ...base, budget: { state: 'ready', percent: null } })).toMatchObject({
      budgetUsedPercent: null,
      budgetState: 'ready',
    });
    expect(buildDashboard({ ...base, budget: { state: 'unavailable', percent: null } }).budgetState).toBe(
      'unavailable',
    );
  });

  it('never mixes currencies', () => {
    const data = buildDashboard({
      ...base,
      current: [money('PKR', 4250, 12000), money('SAR', 99999, 99999)],
      summary: [
        { currency: 'SAR', totalSpent: 99999, transactionCount: 77 },
        { currency: 'PKR', totalSpent: 4250, transactionCount: 12 },
      ],
    });
    expect(data.totalSpending).toBe('4250.00');
    expect(data.transactionCount).toBe(12);
  });
});
