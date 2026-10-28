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
};
