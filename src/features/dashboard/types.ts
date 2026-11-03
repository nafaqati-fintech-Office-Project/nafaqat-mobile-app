import type { TransactionItem } from '@/features/transactions/transactionsApi';

// One category of this month's spending; percent is its share of the month's spending, rounded.
export type CategoryShare = { category: string; amount: string; percent: number };

export type WeeklyAmount = {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Monday
  amount: string;
};

// One day of the month heatmap; level 0 = no spending, 4 = the heaviest days.
export type HeatLevel = 0 | 1 | 2 | 3 | 4;
export type HeatDay = { day: number; amount: string; level: HeatLevel };
export type Heatmap = { offset: number; days: HeatDay[] }; // offset = empty cells before day 1 (Monday first)

export type CashFlow = {
  income: string;
  expenses: string;
  net: string;
  savingsRate: number | null; // percent of income kept; null when there is no income
};

export type MonthlySaving = { year: number; month: number; net: string };

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
  cashFlow: CashFlow;
  heatmap: Heatmap;
  heatmapState: SectionState;
  savingsTrend: MonthlySaving[]; // oldest first, ends with this month
  savingsTrendState: SectionState;
  recent: TransactionItem[]; // newest first
  recentState: SectionState;
};
