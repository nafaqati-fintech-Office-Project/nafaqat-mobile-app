import type { DashboardData } from './types';
import { mockTransactions } from '@/features/transactions/mock';

export const mockDashboard: DashboardData = {
  period: { year: 2026, month: 5 },
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
  categoriesState: 'ready',
  recent: mockTransactions.slice(0, 5),
  recentState: 'ready',
};
