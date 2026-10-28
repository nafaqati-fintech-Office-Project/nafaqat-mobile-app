import type { CurrencyComparison, CurrencyTrend, MonthTotals, SpendingRows } from './insightsApi';
import type { Insights, MerchantTotal, MonthAmount } from './types';
import { pickCurrency, type DateParts } from '@/features/dashboard/dashboardBuilder';
import { categoryFromCode } from '@/features/transactions/categoryDisplay';
import { currencyDecimals } from '@/utils/money';

export const TREND_MONTHS = 12;
const TOP_MERCHANTS = 10;

export type BuildInput = {
  today: DateParts;
  preferredCurrency: string | null;
  trend: CurrencyTrend[];
  comparison: CurrencyComparison[];
  // null when the spending rows could not be loaded.
  spending: SpendingRows | null;
};

const amount = (value: number, currency: string) => value.toFixed(currencyDecimals(currency));
const roundPercent = (value: number | null) => (value === null ? null : Math.round(value));
const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

// The change of a per-day average; null when the previous month had no spending to compare against.
export function changeOf(current: number, previous: number): number | null {
  return previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;
}

// The last TREND_MONTHS calendar months ending with today's, oldest first.
export function lastMonths(today: DateParts): { year: number; month: number }[] {
  return Array.from({ length: TREND_MONTHS }, (_, i) => {
    const index = today.year * 12 + (today.month - 1) - (TREND_MONTHS - 1 - i);
    return { year: Math.floor(index / 12), month: (index % 12) + 1 };
  });
}

const monthKey = ({ year, month }: { year: number; month: number }) => `${year}-${String(month).padStart(2, '0')}`;

// Spending per month in the currency; months the service did not return count as 0.
function monthly(today: DateParts, trend: CurrencyTrend | undefined, currency: string): MonthAmount[] {
  const byMonth = new Map((trend?.months ?? []).map((m) => [m.month, m.expenses]));
  return lastMonths(today).map((m) => ({ ...m, amount: amount(byMonth.get(monthKey(m)) ?? 0, currency) }));
}

const appCategory = (code: string | null, label: string) => categoryFromCode(code) ?? label;

// Per merchant in the currency: total, number of payments and its most frequent category. Largest first.
export function merchantTotals(spending: SpendingRows, currency: string): MerchantTotal[] {
  const groups = new Map<string, { merchant: string; total: number; count: number; categories: Map<string, number> }>();
  for (const row of spending.rows) {
    if (row.currency !== currency || !row.merchant) continue;
    const key = row.merchant.toLowerCase();
    const group = groups.get(key) ?? { merchant: row.merchant, total: 0, count: 0, categories: new Map() };
    group.total += Number(row.amount); // display totals only
    group.count += 1;
    group.categories.set(row.category, (group.categories.get(row.category) ?? 0) + 1);
    groups.set(key, group);
  }
  return [...groups.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, TOP_MERCHANTS)
    .map((g) => ({
      merchant: g.merchant,
      category: [...g.categories.entries()].sort((a, b) => b[1] - a[1])[0][0],
      count: g.count,
      amount: amount(g.total, currency),
    }));
}

const asIncomeExpenses = (rows: CurrencyComparison[], pick: (c: CurrencyComparison) => MonthTotals) =>
  rows.map((c) => {
    const totals = pick(c);
    return { currency: c.currency, totalIncome: totals.income, totalExpenses: totals.expenses, net: totals.net };
  });

export function buildInsights({ today, preferredCurrency, trend, comparison, spending }: BuildInput): Insights {
  const currency = pickCurrency(
    preferredCurrency,
    asIncomeExpenses(comparison, (c) => c.current),
    asIncomeExpenses(comparison, (c) => c.previous),
  );
  const compared = comparison.find((c) => c.currency === currency);
  const current = compared?.current;

  const before = today.month === 1 ? { year: today.year - 1, month: 12 } : { year: today.year, month: today.month - 1 };
  // This month so far (today included) against the whole previous month.
  const avgNow = (current?.expenses ?? 0) / today.day;
  const avgBefore = (compared?.previous.expenses ?? 0) / daysInMonth(before.year, before.month);

  const changes = new Map((compared?.categoryChanges ?? []).map((c) => [c.code ?? c.label, c.percent]));

  return {
    currency,
    savings: amount(current?.net ?? 0, currency),
    savingsChangePercent: roundPercent(compared?.netChangePercent ?? null),
    avgDailySpend: amount(avgNow, currency),
    avgDailyChangePercent: changeOf(avgNow, avgBefore),
    monthly: monthly(today, trend.find((t) => t.currency === currency), currency),
    categoryTrends: (current?.categories ?? []).map((c) => ({
      category: appCategory(c.code, c.label),
      amount: amount(c.total, currency),
      changePercent: roundPercent(changes.get(c.code ?? c.label) ?? null),
    })),
    merchants: spending ? merchantTotals(spending, currency) : [],
    merchantsState: spending ? 'ready' : 'unavailable',
    merchantsTruncated: spending?.truncated ?? false,
  };
}
