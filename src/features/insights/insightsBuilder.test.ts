import { describe, expect, it } from 'vitest';

import type { CurrencyComparison } from './insightsApi';
import { buildInsights, changeOf, lastMonths, merchantTotals } from './insightsBuilder';
import type { TransactionItem } from '@/features/transactions/transactionsApi';

const today = { year: 2026, month: 10, day: 10 };

const comparison: CurrencyComparison = {
  currency: 'SAR',
  current: {
    income: 7500,
    expenses: 1500,
    net: 6000,
    categories: [
      { code: 'GROCERIES', label: 'Groceries', total: 900 },
      { code: 'FOOD_AND_BEVERAGE', label: 'Food & Beverage', total: 600 },
    ],
  },
  previous: { income: 7500, expenses: 3000, net: 4500, categories: [] },
  netChangePercent: 36.36,
  categoryChanges: [
    { code: 'GROCERIES', label: 'Groceries', percent: 12.5 },
    { code: 'FOOD_AND_BEVERAGE', label: 'Food & Beverage', percent: null },
  ],
};

const row = (merchant: string | null, amount: string, category = 'Groceries', currency = 'SAR'): TransactionItem => ({
  id: `${merchant}-${amount}`,
  merchant,
  category,
  type: 'DEBIT',
  amount,
  currency,
  date: new Date(2026, 9, 5),
  manual: false,
});

describe('lastMonths', () => {
  it('ends with the current month and crosses the year', () => {
    const months = lastMonths({ year: 2026, month: 2, day: 1 });
    expect(months).toHaveLength(12);
    expect(months[0]).toEqual({ year: 2025, month: 3 });
    expect(months[11]).toEqual({ year: 2026, month: 2 });
  });
});

describe('changeOf', () => {
  it('is the rounded change, null without a previous value', () => {
    expect(changeOf(150, 100)).toBe(50);
    expect(changeOf(88, 100)).toBe(-12);
    expect(changeOf(10, 0)).toBeNull();
  });
});

describe('merchantTotals', () => {
  it('groups by name, ignores other currencies and unnamed rows, largest first', () => {
    const totals = merchantTotals(
      {
        rows: [
          row('Panda', '100.50'),
          row('panda', '200', 'Food & Beverage'),
          row('Panda', '50'),
          row('Uber', '400', 'Transportation'),
          row('Uber', '999', 'Transportation', 'PKR'),
          row(null, '10'),
        ],
        truncated: false,
      },
      'SAR',
    );
    expect(totals).toEqual([
      { merchant: 'Uber', category: 'Transportation', count: 1, amount: '400.00' },
      { merchant: 'Panda', category: 'Groceries', count: 3, amount: '350.50' },
    ]);
  });
});

describe('buildInsights', () => {
  const trend = [{ currency: 'SAR', months: [{ month: '2026-10', expenses: 1500, net: 6000 }, { month: '2026-09', expenses: 3000, net: 4500 }] }];

  it('builds the overview from the comparison and the trend', () => {
    const insights = buildInsights({ today, preferredCurrency: 'SAR', trend, comparison: [comparison], spending: null });
    expect(insights).toMatchObject({
      currency: 'SAR',
      savings: '6000.00',
      savingsChangePercent: 36,
      avgDailySpend: '150.00', // 1500 over 10 days
      avgDailyChangePercent: 50, // against 3000 / 30 = 100 a day in September
      merchantsState: 'unavailable',
    });
    expect(insights.monthly).toHaveLength(12);
    expect(insights.monthly[11]).toEqual({ year: 2026, month: 10, amount: '1500.00' });
    expect(insights.monthly[10]).toEqual({ year: 2026, month: 9, amount: '3000.00' });
    expect(insights.monthly[0].amount).toBe('0.00');
  });

  it('names categories the app way with their change', () => {
    const { categoryTrends } = buildInsights({ today, preferredCurrency: 'SAR', trend, comparison: [comparison], spending: null });
    expect(categoryTrends).toEqual([
      { category: 'Groceries', amount: '900.00', changePercent: 13 },
      { category: 'Food & Beverage', amount: '600.00', changePercent: null },
    ]);
  });

  it('shows zeros, not an error, for a user with no transactions', () => {
    const insights = buildInsights({
      today,
      preferredCurrency: 'SAR',
      trend: [],
      comparison: [],
      spending: { rows: [], truncated: false },
    });
    expect(insights).toMatchObject({
      currency: 'SAR',
      savings: '0.00',
      savingsChangePercent: null,
      avgDailyChangePercent: null,
      categoryTrends: [],
      merchants: [],
      merchantsState: 'ready',
    });
  });
});
