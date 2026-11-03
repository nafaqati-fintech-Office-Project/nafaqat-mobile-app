import { describe, expect, it } from 'vitest';

import {
  biggestExpense,
  buildReport,
  lifestyleGroup,
  lifestyleShares,
  pickReportCurrency,
  reportCategories,
  type BuildInput,
} from './reportBuilder';
import type { CurrencyComparison, MonthTotals, SpendingRows } from '@/features/insights/insightsApi';

const totals = (income: number, expenses: number, categories: MonthTotals['categories'] = []): MonthTotals => ({
  income,
  expenses,
  net: income - expenses,
  categories,
});

const comparison = (currency: string, current: MonthTotals, previous: MonthTotals): CurrencyComparison => ({
  currency,
  current,
  previous,
  netChangePercent: null,
  categoryChanges: [],
});

const categories = [
  { code: 'GROCERIES', label: 'Groceries', total: 600 },
  { code: 'ENTERTAINMENT', label: 'Entertainment', total: 300 },
  { code: 'CHARITY', label: 'Charity', total: 100 },
];

const row = (merchant: string | null, amount: string, category = 'Groceries', currency = 'PKR') => ({
  id: merchant ?? 'x',
  merchant,
  category,
  type: 'DEBIT' as const,
  amount,
  currency,
  date: new Date('2026-10-05T10:00:00Z'),
  manual: false,
});

const spending: SpendingRows = {
  rows: [row('Panda', '500'), row('Panda', '100'), row('Netflix', '300', 'Entertainment'), row('Other', '9999', 'Travel', 'SAR')],
  truncated: false,
};

const base: BuildInput = {
  period: { year: 2026, month: 10 },
  preferredCurrency: 'PKR',
  comparison: [comparison('PKR', totals(2000, 1000, categories), totals(1600, 800))],
  trend: [{ currency: 'PKR', months: [{ month: '2026-09', expenses: 800, net: 800 }, { month: '2026-10', expenses: 1000, net: 1000 }] }],
  spending,
  daysCounted: 20,
};

describe('lifestyleGroup', () => {
  it('splits needs, wants and the rest', () => {
    expect(lifestyleGroup('Groceries')).toBe('essentials');
    expect(lifestyleGroup('Subscriptions')).toBe('lifestyle');
    expect(lifestyleGroup('Charity')).toBe('other');
    expect(lifestyleGroup('Uncategorized')).toBe('other');
  });
});

describe('reportCategories', () => {
  it('lists categories largest first with their share, skipping empty ones', () => {
    const rows = reportCategories(totals(0, 1000, [...categories, { code: 'FUEL', label: 'Fuel', total: 0 }].reverse()), 'PKR');
    expect(rows.map((r) => r.category)).toEqual(['Groceries', 'Entertainment', 'Charity']);
    expect(rows.map((r) => r.percent)).toEqual([60, 30, 10]);
    expect(rows[0].amount).toBe('600.00');
  });

  it('is empty without data', () => {
    expect(reportCategories(undefined, 'PKR')).toEqual([]);
  });
});

describe('lifestyleShares', () => {
  it('shares spending between essentials, lifestyle and other', () => {
    expect(lifestyleShares(totals(0, 1000, categories), 'PKR')).toEqual([
      { group: 'essentials', amount: '600.00', percent: 60 },
      { group: 'lifestyle', amount: '300.00', percent: 30 },
      { group: 'other', amount: '100.00', percent: 10 },
    ]);
  });

  it('is all zero for an empty month', () => {
    expect(lifestyleShares(undefined, 'PKR').every((s) => s.percent === 0)).toBe(true);
  });
});

describe('biggestExpense', () => {
  it('ignores other currencies', () => {
    expect(biggestExpense(spending, 'PKR')).toEqual({ merchant: 'Panda', category: 'Groceries', amount: '500' });
    expect(biggestExpense({ rows: [], truncated: false }, 'PKR')).toBeNull();
  });
});

describe('pickReportCurrency', () => {
  it('prefers the user currency, else the one spent most in', () => {
    const rows = [comparison('PKR', totals(0, 10), totals(0, 0)), comparison('SAR', totals(0, 99), totals(0, 0))];
    expect(pickReportCurrency('PKR', rows)).toBe('PKR');
    expect(pickReportCurrency('KWD', rows)).toBe('SAR');
    expect(pickReportCurrency(null, [])).toBe('PKR');
  });
});

describe('buildReport', () => {
  it('builds the month from the comparison, trend and spending rows', () => {
    const report = buildReport(base);
    expect(report).toMatchObject({
      currency: 'PKR',
      spent: '1000.00',
      income: '2000.00',
      net: '1000.00',
      avgDaily: '50.00',
      savingsRate: 50,
      transactionCount: 3,
      merchantsState: 'ready',
      trendState: 'ready',
    });
    expect(report.comparison.income).toEqual({ current: '2000.00', previous: '1600.00', changePercent: 25 });
    expect(report.comparison.expenses.changePercent).toBe(25);
    expect(report.merchants[0]).toMatchObject({ merchant: 'Panda', count: 2, amount: '600.00' });
  });

  it('puts six months in the trend, oldest first, with missing months at 0', () => {
    const { trend } = buildReport(base);
    expect(trend).toHaveLength(6);
    expect(trend[0]).toEqual({ year: 2026, month: 5, amount: '0.00' });
    expect(trend[4]).toEqual({ year: 2026, month: 9, amount: '800.00' });
    expect(trend[5]).toEqual({ year: 2026, month: 10, amount: '1000.00' });
  });

  it('has no percentage when last month had nothing', () => {
    const report = buildReport({ ...base, comparison: [comparison('PKR', totals(2000, 1000), totals(0, 0))] });
    expect(report.comparison.expenses.changePercent).toBeNull();
    expect(report.comparison.net.changePercent).toBeNull();
  });

  it('keeps the report when the trend and spending rows cannot be loaded', () => {
    const report = buildReport({ ...base, trend: null, spending: null });
    expect(report.trendState).toBe('unavailable');
    expect(report.merchantsState).toBe('unavailable');
    expect(report.transactionCount).toBeNull();
    expect(report.biggest).toBeNull();
    expect(report.spent).toBe('1000.00');
  });

  it('is all zeros for a month without data', () => {
    const report = buildReport({ ...base, comparison: [], trend: [], spending: { rows: [], truncated: false } });
    expect(report).toMatchObject({ spent: '0.00', savingsRate: null, transactionCount: 0, categories: [], merchants: [] });
  });

  it('uses three decimals for KWD', () => {
    const report = buildReport({ ...base, preferredCurrency: 'KWD', comparison: [comparison('KWD', totals(20, 12.5), totals(0, 0))] });
    expect(report.spent).toBe('12.500');
  });
});
