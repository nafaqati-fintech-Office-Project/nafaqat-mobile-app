import type { Insights, MonthAmount } from './types';

// Hardcoded insights for the design pass, until the screen is wired to the reports service.
// Months end with the current one so the chart always reads as recent.
const MONTHLY_SPEND = ['3650', '4100', '3820', '4480', '3900', '3200', '3600', '3450', '3900', '3300', '3750', '4250'];

function lastMonths(amounts: string[]): MonthAmount[] {
  const now = new Date();
  return amounts.map((amount, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (amounts.length - 1 - i), 1);
    return { year: date.getFullYear(), month: date.getMonth() + 1, amount };
  });
}

export const mockInsights: Insights = {
  currency: 'SAR',
  savings: '1200',
  savingsChangePercent: 18,
  avgDailySpend: '137',
  avgDailyChangePercent: -12,
  monthly: lastMonths(MONTHLY_SPEND),
  categoryTrends: [
    { category: 'Groceries', amount: '1274', changePercent: 14 },
    { category: 'Food & Beverage', amount: '935', changePercent: -8 },
    { category: 'Clothing & Shopping', amount: '765', changePercent: 22 },
    { category: 'Transportation', amount: '638', changePercent: -5 },
    { category: 'Utilities', amount: '340', changePercent: 0 },
    { category: 'Entertainment', amount: '298', changePercent: -31 },
  ],
  merchants: [
    { merchant: 'Panda', category: 'Groceries', count: 9, amount: '1274' },
    { merchant: 'Amazon', category: 'Clothing & Shopping', count: 4, amount: '765' },
    { merchant: 'Starbucks', category: 'Food & Beverage', count: 14, amount: '392' },
    { merchant: 'Uber', category: 'Transportation', count: 11, amount: '388' },
    { merchant: 'SEC', category: 'Utilities', count: 1, amount: '340' },
    { merchant: 'Spotify', category: 'Subscriptions', count: 1, amount: '24.99' },
  ],
};
