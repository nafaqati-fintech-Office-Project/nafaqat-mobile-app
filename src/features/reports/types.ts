import type { MerchantTotal, MonthAmount } from '@/features/insights/types';

// Amounts are decimal strings in the report's currency. changePercent compares with the previous
// month; null when the previous month was 0 or negative (nothing sensible to compare against).
export type ReportCategory = { category: string; amount: string; percent: number };

export type LifestyleGroup = 'essentials' | 'lifestyle' | 'other';
export type LifestyleShare = { group: LifestyleGroup; amount: string; percent: number };

export type Change = { current: string; previous: string; changePercent: number | null };

export type BiggestExpense = { merchant: string | null; category: string; amount: string };

// One week (they start on Sunday) of the month's everyday spending; start is its first day, YYYY-MM-DD.
// partial: the week runs into the month before or after, and only this month's days are counted.
export type WeekSpending = { start: string; amount: string; partial: boolean };

// Spending by the card it was paid with. card is the last four digits, or null for payments with no card
// in their description (cash, wallets, accounts).
export type PaymentMethod = { card: string | null; amount: string; count: number; percent: number };

// Where the month's money went: everyday spending, transfers to other people, and cash taken out (part of
// the everyday spending), against what came in. Own-account moves and refunds are in neither.
export type MoneyMovement = { dayToDay: string; transfers: string; cash: string; income: string };

// What went to loans and instalments this month.
export type DebtSummary = { loans: string; percentOfIncome: number | null; percentOfSpending: number };

// One spending row of the month, as exported.
export type ReportRow = { date: string; merchant: string; description: string; category: string; amount: string };

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
  // Built from the spending rows, so empty when merchantsState is 'unavailable'.
  weeks: WeekSpending[];
  paymentMethods: PaymentMethod[];
  rows: ReportRow[];
  // Built from the month's category totals.
  movement: MoneyMovement;
  debt: DebtSummary;
};
