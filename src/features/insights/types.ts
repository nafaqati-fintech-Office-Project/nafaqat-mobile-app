// Amounts are decimal strings. changePercent compares with the previous month (positive = went up);
// null when there is nothing to compare against (the previous month was 0).
export type MonthAmount = { year: number; month: number; amount: string };

export type CategoryTrend = { category: string; amount: string; changePercent: number | null };

export type MerchantTotal = { merchant: string; category: string; count: number; amount: string };

export type Insights = {
  currency: string;
  savings: string;
  savingsChangePercent: number | null;
  avgDailySpend: string;
  avgDailyChangePercent: number | null;
  // Oldest first, ending with the current month.
  monthly: MonthAmount[];
  categoryTrends: CategoryTrend[];
  merchants: MerchantTotal[];
  // 'unavailable' when the merchant totals could not be loaded; the rest of the screen still shows.
  merchantsState: 'ready' | 'unavailable';
  // True when the month had more spending rows than the app reads, so the totals are partial.
  merchantsTruncated: boolean;
};
