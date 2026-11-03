import type { BiggestExpense, Change, LifestyleGroup, LifestyleShare, Report, ReportCategory } from './types';
import { lastMonths, savingsRate } from '@/features/dashboard/heatmapMath';
import type { CurrencyComparison, CurrencyTrend, MonthTotals, SpendingRows } from '@/features/insights/insightsApi';
import { changeOf, merchantTotals } from '@/features/insights/insightsBuilder';
import { categoryFromCode } from '@/features/transactions/categoryDisplay';
import { currencyDecimals } from '@/utils/money';

export const TREND_MONTHS = 6;

// Which spending is a need and which a want. Anything not listed (Charity, Investments, Transfers,
// Uncategorized ...) is "other".
const ESSENTIALS = new Set([
  'Groceries',
  'Utilities',
  'Health',
  'Education',
  'Transportation',
  'Fuel',
  'Housing',
  'Loans/EMI',
]);
const LIFESTYLE = new Set(['Food & Beverage', 'Clothing & Shopping', 'Entertainment', 'Travel', 'Subscriptions']);

export const lifestyleGroup = (category: string): LifestyleGroup =>
  ESSENTIALS.has(category) ? 'essentials' : LIFESTYLE.has(category) ? 'lifestyle' : 'other';

export type BuildInput = {
  period: { year: number; month: number };
  preferredCurrency: string | null;
  comparison: CurrencyComparison[];
  trend: CurrencyTrend[] | null; // null when the trend could not be loaded
  spending: SpendingRows | null; // null when the spending rows could not be loaded
  daysCounted: number; // days the average is spread over: the whole month, or the days so far this month
};

const DEFAULT_CURRENCY = 'PKR';
const amount = (value: number, currency: string) => value.toFixed(currencyDecimals(currency));
const monthKey = ({ year, month }: { year: number; month: number }) => `${year}-${String(month).padStart(2, '0')}`;
const percentOf = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

// The preferred currency if the reports have it; otherwise the one the user spent most in.
export function pickReportCurrency(preferred: string | null, comparison: CurrencyComparison[]): string {
  if (preferred && comparison.some((c) => c.currency === preferred)) return preferred;
  const biggest = [...comparison].sort((a, b) => b.current.expenses - a.current.expenses)[0];
  return biggest?.currency ?? preferred ?? DEFAULT_CURRENCY;
}

export function reportCategories(totals: MonthTotals | undefined, currency: string): ReportCategory[] {
  const rows = (totals?.categories ?? []).filter((c) => c.total > 0);
  const whole = rows.reduce((sum, c) => sum + c.total, 0);
  return rows
    .map((c) => ({ category: categoryFromCode(c.code) ?? c.label, total: c.total }))
    .sort((a, b) => b.total - a.total)
    .map((c) => ({ category: c.category, amount: amount(c.total, currency), percent: percentOf(c.total, whole) }));
}

// Essentials / lifestyle / other: their share of the month's categorised spending.
export function lifestyleShares(totals: MonthTotals | undefined, currency: string): LifestyleShare[] {
  const sums: Record<LifestyleGroup, number> = { essentials: 0, lifestyle: 0, other: 0 };
  for (const c of totals?.categories ?? []) {
    if (c.total > 0) sums[lifestyleGroup(categoryFromCode(c.code) ?? c.label)] += c.total;
  }
  const whole = sums.essentials + sums.lifestyle + sums.other;
  return (['essentials', 'lifestyle', 'other'] as const).map((group) => ({
    group,
    amount: amount(sums[group], currency),
    percent: percentOf(sums[group], whole),
  }));
}

export function biggestExpense(spending: SpendingRows, currency: string): BiggestExpense | null {
  let top: SpendingRows['rows'][number] | null = null;
  for (const row of spending.rows) {
    if (row.currency === currency && (!top || Number(row.amount) > Number(top.amount))) top = row;
  }
  return top ? { merchant: top.merchant, category: top.category, amount: top.amount } : null;
}

const change = (current: number, previous: number, currency: string): Change => ({
  current: amount(current, currency),
  previous: amount(previous, currency),
  // A previous month with nothing (or a loss) has no meaningful percentage.
  changePercent: previous > 0 ? changeOf(current, previous) : null,
});

export function buildReport({ period, preferredCurrency, comparison, trend, spending, daysCounted }: BuildInput): Report {
  const currency = pickReportCurrency(preferredCurrency, comparison);
  const row = comparison.find((c) => c.currency === currency);
  const current = row?.current;
  const previous = row?.previous;
  const spent = current?.expenses ?? 0;
  const income = current?.income ?? 0;
  const net = current?.net ?? 0;

  const byMonth = new Map(
    trend?.find((t) => t.currency === currency)?.months.map((m) => [m.month, m.expenses]),
  );
  const rows = spending?.rows.filter((r) => r.currency === currency);

  return {
    period,
    currency,
    spent: amount(spent, currency),
    income: amount(income, currency),
    net: amount(net, currency),
    avgDaily: amount(daysCounted > 0 ? spent / daysCounted : 0, currency),
    savingsRate: savingsRate(income, net),
    categories: reportCategories(current, currency),
    lifestyle: lifestyleShares(current, currency),
    comparison: {
      income: change(income, previous?.income ?? 0, currency),
      expenses: change(spent, previous?.expenses ?? 0, currency),
      net: change(net, previous?.net ?? 0, currency),
    },
    trend: lastMonths(period.year, period.month, TREND_MONTHS).map((m) => ({
      ...m,
      amount: amount(byMonth.get(monthKey(m)) ?? 0, currency),
    })),
    trendState: trend ? 'ready' : 'unavailable',
    transactionCount: rows ? rows.length : null,
    biggest: spending ? biggestExpense(spending, currency) : null,
    merchants: spending ? merchantTotals(spending, currency) : [],
    merchantsState: spending ? 'ready' : 'unavailable',
    merchantsTruncated: spending?.truncated ?? false,
  };
}
