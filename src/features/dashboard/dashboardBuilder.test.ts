import { describe, expect, it } from 'vitest';

import {
  buildDashboard,
  categoryShares,
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
  comparison: { state: 'ready', rows: [] },
  recent: { state: 'ready', items: [] },
};

const totals = (categories: { code: string | null; label: string; total: number }[]) => ({
  income: 0,
  expenses: categories.reduce((sum, c) => sum + c.total, 0),
  net: 0,
  categories,
});

const comparison = (currency: string, categories: { code: string | null; label: string; total: number }[]) => ({
  currency,
  current: totals(categories),
  previous: totals([]),
  netChangePercent: null,
  categoryChanges: [],
});

const txn = (id: number) => ({
  id: String(id),
  merchant: `Shop ${id}`,
  category: 'Groceries',
  type: 'DEBIT' as const,
  amount: '10.00',
  currency: 'PKR',
  date: new Date(2026, 9, 28),
  manual: false,
});

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

describe('categoryShares', () => {
  it('lists the largest categories with their share of the month, in app names', () => {
    const rows = [
      comparison('PKR', [
        { code: 'HOUSING', label: 'Housing', total: 500 },
        { code: 'GROCERIES', label: 'Groceries', total: 300 },
        { code: 'UNCATEGORIZED', label: 'Uncategorized', total: 200 },
      ]),
    ];
    expect(categoryShares(rows, 'PKR')).toEqual([
      { category: 'Housing', amount: '500.00', percent: 50 },
      { category: 'Groceries', amount: '300.00', percent: 30 },
      { category: 'Uncategorized', amount: '200.00', percent: 20 },
    ]);
  });

  it('keeps the top five, largest first, sharing out of the whole month', () => {
    const many = [10, 60, 20, 5, 40, 15, 50].map((total, i) => ({ code: null, label: `Cat ${i}`, total }));
    const shares = categoryShares([comparison('PKR', many)], 'PKR');
    expect(shares.map((s) => s.category)).toEqual(['Cat 1', 'Cat 6', 'Cat 4', 'Cat 2', 'Cat 5']);
    expect(shares[0].percent).toBe(30); // 60 of 200
  });

  it('only uses the dashboard currency and skips empty categories', () => {
    const rows = [
      comparison('SAR', [{ code: 'FUEL', label: 'Fuel', total: 999 }]),
      comparison('PKR', [
        { code: 'FUEL', label: 'Fuel', total: 100 },
        { code: 'TRAVEL', label: 'Travel', total: 0 },
      ]),
    ];
    expect(categoryShares(rows, 'PKR')).toEqual([{ category: 'Fuel', amount: '100.00', percent: 100 }]);
    expect(categoryShares(rows, 'AED')).toEqual([]);
  });
});

describe('buildDashboard sections', () => {
  it('adds the categories and the newest transactions', () => {
    const data = buildDashboard({
      ...base,
      comparison: { state: 'ready', rows: [comparison('PKR', [{ code: 'FUEL', label: 'Fuel', total: 100 }])] },
      recent: { state: 'ready', items: [1, 2, 3, 4, 5, 6, 7].map(txn) },
    });
    expect(data.categories).toHaveLength(1);
    expect(data.recent.map((t) => t.id)).toEqual(['1', '2', '3', '4', '5']);
    expect(data).toMatchObject({ categoriesState: 'ready', recentState: 'ready' });
  });

  it('marks a section that could not be loaded', () => {
    const data = buildDashboard({
      ...base,
      comparison: { state: 'unavailable', rows: [] },
      recent: { state: 'unavailable', items: [] },
    });
    expect(data).toMatchObject({ categories: [], categoriesState: 'unavailable', recent: [], recentState: 'unavailable' });
  });
});
