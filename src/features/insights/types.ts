// Amounts are decimal strings; changePercent compares with the previous period (positive = went up).
export type MonthAmount = { year: number; month: number; amount: string };

export type CategoryTrend = { category: string; amount: string; changePercent: number };

export type MerchantTotal = { merchant: string; category: string; count: number; amount: string };

export type Insights = {
  currency: string;
  savings: string;
  savingsChangePercent: number;
  avgDailySpend: string;
  avgDailyChangePercent: number;
  // Oldest first, ending with the current month.
  monthly: MonthAmount[];
  categoryTrends: CategoryTrend[];
  merchants: MerchantTotal[];
};
