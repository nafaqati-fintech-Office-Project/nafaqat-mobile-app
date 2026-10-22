export type WeeklyAmount = {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Monday
  amount: string;
};

export type DashboardData = {
  period: { year: number; month: number };
  currency: string;
  totalSpending: string;
  changePercent: number; // signed, vs previous period
  weekly: WeeklyAmount[];
  transactionCount: number;
  budgetUsedPercent: number | null;
  activeSubscriptions: number;
  savings: string;
};
