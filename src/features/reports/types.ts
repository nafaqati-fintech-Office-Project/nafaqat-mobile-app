import type { MerchantTotal, MonthAmount } from '@/features/insights/types';

// Amounts are decimal strings in the report's currency. changePercent compares with the previous
// month; null when the previous month was 0 or negative (nothing sensible to compare against).
export type ReportCategory = { category: string; amount: string; percent: number };

export type LifestyleGroup = 'essentials' | 'lifestyle' | 'other';
export type LifestyleShare = { group: LifestyleGroup; amount: string; percent: number };

export type Change = { current: string; previous: string; changePercent: number | null };

export type BiggestExpense = { merchant: string | null; category: string; amount: string };

export type Report = {
  period: { year: number; month: number };
  currency: string;
  spent: string;
  income: string;
  net: string;
  avgDaily: string;
  savingsRate: number | null; // percent of income kept; null when there is no income
  categories: ReportCategory[]; // largest first
  lifestyle: LifestyleShare[]; // always essentials, lifestyle, other
  comparison: { income: Change; expenses: Change; net: Change };
  // Oldest first, ending with the report's month.
  trend: MonthAmount[];
  trendState: 'ready' | 'unavailable';
  // The month's spending rows: transaction count, biggest expense and merchants come from them.
  transactionCount: number | null;
  biggest: BiggestExpense | null;
  merchants: MerchantTotal[];
  merchantsState: 'ready' | 'unavailable';
  // True when the month had more spending rows than the app reads, so those numbers are partial.
  merchantsTruncated: boolean;
};
