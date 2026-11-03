import type { Report } from './types';
import type { MonthAmount } from '@/features/insights/types';

// MOCK report shown in auth bypass (no token for the reports service). The month is set by the caller.
// A signed-in account gets real numbers from the reports service.
const SPENT = ['3650', '4100', '3820', '4480', '3900', '4250'];

export function mockReport(period: { year: number; month: number }): Report {
  const trend: MonthAmount[] = SPENT.map((amount, i) => {
    const date = new Date(period.year, period.month - 1 - (SPENT.length - 1 - i), 1);
    return { year: date.getFullYear(), month: date.getMonth() + 1, amount };
  });
  return {
    period,
    currency: 'SAR',
    spent: '4250.00',
    income: '5450.00',
    net: '1200.00',
    avgDaily: '137.10',
    savingsRate: 22,
    categories: [
      { category: 'Housing', amount: '1500.00', percent: 35 },
      { category: 'Groceries', amount: '980.00', percent: 23 },
      { category: 'Food & Beverage', amount: '720.00', percent: 17 },
      { category: 'Transportation', amount: '540.00', percent: 13 },
      { category: 'Subscriptions', amount: '310.00', percent: 7 },
      { category: 'Entertainment', amount: '200.00', percent: 5 },
    ],
    lifestyle: [
      { group: 'essentials', amount: '3020.00', percent: 71 },
      { group: 'lifestyle', amount: '1230.00', percent: 29 },
      { group: 'other', amount: '0.00', percent: 0 },
    ],
    comparison: {
      income: { current: '5450.00', previous: '5450.00', changePercent: 0 },
      expenses: { current: '4250.00', previous: '3900.00', changePercent: 9 },
      net: { current: '1200.00', previous: '1550.00', changePercent: -23 },
    },
    trend,
    trendState: 'ready',
    transactionCount: 128,
    biggest: { merchant: 'Al Rajhi Real Estate', category: 'Housing', amount: '1500.00' },
    merchants: [
      { merchant: 'Panda', category: 'Groceries', count: 9, amount: '980.00' },
      { merchant: 'Starbucks', category: 'Food & Beverage', count: 14, amount: '392.00' },
      { merchant: 'Uber', category: 'Transportation', count: 11, amount: '388.00' },
      { merchant: 'SEC', category: 'Utilities', count: 1, amount: '340.00' },
      { merchant: 'Spotify', category: 'Subscriptions', count: 1, amount: '24.99' },
    ],
    merchantsState: 'ready',
    merchantsTruncated: false,
  };
}
