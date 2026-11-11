import type { DashboardData } from './types';
import { mockTransactions } from '@/features/transactions/mock';

export const mockDashboard: DashboardData = {
  period: { year: 2026, month: 5 },
  months: 1,
  currency: 'SAR',
  totalSpending: '4250',
  changePercent: -12,
  weekly: [
    { day: 0, amount: '420' },
    { day: 1, amount: '610' },
    { day: 2, amount: '380' },
    { day: 3, amount: '720' },
    { day: 4, amount: '890' },
    { day: 5, amount: '760' },
    { day: 6, amount: '470' },
  ],
  transactionCount: 128,
  budgetUsedPercent: 65,
  budgetState: 'ready',
  activeSubscriptions: 6,
  subscriptionsState: 'ready',
  savings: '1200',
  categories: [
    { category: 'Housing', amount: '1500', percent: 35 },
    { category: 'Groceries', amount: '980', percent: 23 },
    { category: 'Food & Beverage', amount: '720', percent: 17 },
    { category: 'Transportation', amount: '540', percent: 13 },
    { category: 'Subscriptions', amount: '310', percent: 7 },
  ],
  // MOCK numbers for the demo (AUTH_BYPASS). A signed-in account gets real ones from the reports service.
  cashFlow: { income: '5450', expenses: '4250', net: '1200', savingsRate: 22 },
  heatmap: {
    offset: 4, // 1 May 2026 is a Friday
    days: Array.from({ length: 31 }, (_, i) => {
      const amount = [0, 120, 340, 90, 780, 210, 0, 450, 160, 920, 60, 300][i % 12];
      const level = amount === 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((amount / 920) * 4)));
      return { day: i + 1, amount: String(amount), level: level as 0 | 1 | 2 | 3 | 4 };
    }),
  },
  heatmapState: 'ready',
  savingsTrend: [
    { year: 2025, month: 12, net: '800' },
    { year: 2026, month: 1, net: '-300' },
    { year: 2026, month: 2, net: '450' },
    { year: 2026, month: 3, net: '1500' },
    { year: 2026, month: 4, net: '950' },
    { year: 2026, month: 5, net: '1200' },
  ],
  savingsTrendState: 'ready',
  categoriesState: 'ready',
  recent: mockTransactions.slice(0, 5),
  recentState: 'ready',
};
