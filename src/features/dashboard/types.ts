import type { TransactionItem } from '@/features/transactions/transactionsApi';

// One category of this month's spending; percent is its share of the month's spending, rounded.
export type CategoryShare = { category: string; amount: string; percent: number };

export type WeeklyAmount = {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Monday
  amount: string;
};

// "unavailable" means the backend part is not reachable yet; the tile shows "Coming soon".
export type SectionState = 'ready' | 'unavailable';

export type DashboardData = {
  period: { year: number; month: number };
  currency: string;
  totalSpending: string;
  changePercent: number; // signed, vs previous period
  weekly: WeeklyAmount[]; // the current Monday-to-Sunday week
  transactionCount: number;
  budgetUsedPercent: number | null; // null = no active budget
  budgetState: SectionState;
  activeSubscriptions: number;
  subscriptionsState: SectionState;
  savings: string; // income minus expenses for the month
  categories: CategoryShare[]; // this month's largest categories, largest first
  categoriesState: SectionState;
  recent: TransactionItem[]; // newest first
  recentState: SectionState;
};
