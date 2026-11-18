import type { DailyEntry, DateRange, IncomeExpenses, SpendingEntry } from './dashboardApi';
import { heatLevel, monthGrid, savingsRate } from './heatmapMath';
import type {
  CashFlow,
  CategoryShare,
  DashboardData,
  Heatmap,
  MonthlySaving,
  SectionState,
  WeeklyAmount,
} from './types';
import type { CurrencyComparison } from '@/features/insights/insightsApi';
import { categoryFromCode } from '@/features/transactions/categoryDisplay';
import type { TransactionItem } from '@/features/transactions/transactionsApi';
import { currencyDecimals } from '@/utils/money';

// Categories the dashboard lists; the rest are on the Insights tab.
export const TOP_CATEGORIES = 5;
export const RECENT_COUNT = 5;

export type DateParts = { year: number; month: number; day: number }; // month is 1-12

const DEFAULT_CURRENCY = 'PKR';
const pad = (value: number) => String(value).padStart(2, '0');
const isoDate = ({ year, month, day }: DateParts) => `${year}-${pad(month)}-${pad(day)}`;

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

// Today's calendar date in the given IANA zone (not the phone's zone).
export function todayIn(timeZone: string, now: Date = new Date()): DateParts {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
  } catch {
    return todayIn('UTC', now);
  }
  const pick = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: pick('year'), month: pick('month'), day: pick('day') };
}

export function monthRange(year: number, month: number): DateRange {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    startDate: isoDate({ year, month, day: 1 }),
    endDate: isoDate({ year, month, day: lastDay }),
  };
}

export function previousMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

// 0 = Monday ... 6 = Sunday for a YYYY-MM-DD date; null when the text is not a date.
export function weekdayIndex(date: string): number | null {
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return null;
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

// The user's own currency if the reports have it; otherwise the one they spent most in.
export function pickCurrency(
  preferred: string | null,
  current: IncomeExpenses[],
  previous: IncomeExpenses[],
): string {
  const all = [...current, ...previous];
  if (preferred && all.some((entry) => entry.currency === preferred)) return preferred;
  const biggest = [...current].sort((a, b) => b.totalExpenses - a.totalExpenses)[0];
  return biggest?.currency ?? preferred ?? DEFAULT_CURRENCY;
}

const amount = (value: number, currency: string) => value.toFixed(currencyDecimals(currency));

export function changePercent(current: number, previous: number): number {
  if (previous <= 0) return 0; // nothing to compare against
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export type BuildInput = {
  period: { year: number; month: number };
  // How many months, ending with `period`, the totals and categories cover.
  months?: number;
  preferredCurrency: string | null;
  current: IncomeExpenses[];
  previous: IncomeExpenses[];
  summary: SpendingEntry[];
  // Daily spending over the whole selected period (the same months as the totals).
  daily: DailyEntry[];
  monthDaily: { state: SectionState; rows: DailyEntry[] };
  trend: { state: SectionState; months: { year: number; month: number; rows: IncomeExpenses[] }[] };
  budget: { state: SectionState; percent: number | null };
  subscriptions: { state: SectionState; count: number };
  comparison: { state: SectionState; rows: CurrencyComparison[] };
  recent: { state: SectionState; items: TransactionItem[] };
};

// This month's spending per category in the currency (the report sends them largest first).
export function categoryShares(comparison: CurrencyComparison[], currency: string): CategoryShare[] {
  const categories = (comparison.find((c) => c.currency === currency)?.current.categories ?? []).filter(
    (c) => c.total > 0,
  );
  const total = categories.reduce((sum, c) => sum + c.total, 0);
  return [...categories]
    .sort((a, b) => b.total - a.total)
    .slice(0, TOP_CATEGORIES)
    .map((c) => ({
      category: categoryFromCode(c.code) ?? c.label,
      amount: amount(c.total, currency),
      percent: Math.round((c.total / total) * 100),
    }));
}

// Every day of the month with its shade; days without spending are level 0.
export function buildHeatmap(
  period: { year: number; month: number },
  rows: DailyEntry[],
  currency: string,
): Heatmap {
  const { offset, daysInMonth } = monthGrid(period.year, period.month);
  const totals = new Map(
    rows.find((row) => row.currency === currency)?.days.map((d) => [Number(d.date.slice(8, 10)), d.total]),
  );
  const peak = Math.max(0, ...totals.values());
  return {
    offset,
    days: Array.from({ length: daysInMonth }, (_, i) => {
      const value = totals.get(i + 1) ?? 0;
      return { day: i + 1, amount: amount(value, currency), level: heatLevel(value, peak) };
    }),
  };
}

export function buildCashFlow(entry: IncomeExpenses | undefined, currency: string): CashFlow {
  const income = entry?.totalIncome ?? 0;
  const net = entry?.net ?? 0;
  return {
    income: amount(income, currency),
    expenses: amount(entry?.totalExpenses ?? 0, currency),
    net: amount(net, currency),
    savingsRate: savingsRate(income, net),
  };
}

// Net (income minus expenses) of each month; a month with no data counts as 0.
export function buildSavingsTrend(months: BuildInput['trend']['months'], currency: string): MonthlySaving[] {
  return months.map(({ year, month, rows }) => ({
    year,
    month,
    net: amount(rows.find((row) => row.currency === currency)?.net ?? 0, currency),
  }));
}

export function buildDashboard(input: BuildInput): DashboardData {
  const currency = pickCurrency(input.preferredCurrency, input.current, input.previous);
  const inCurrency = <T extends { currency: string }>(rows: T[]) =>
    rows.find((row) => row.currency === currency);

  const current = inCurrency(input.current);
  const previous = inCurrency(input.previous);
  const spent = inCurrency(input.summary);

  // Spending added up for each day of the week (Monday to Sunday) over the selected period.
  const perWeekday = [0, 0, 0, 0, 0, 0, 0];
  for (const entry of inCurrency(input.daily)?.days ?? []) {
    const index = weekdayIndex(entry.date);
    if (index !== null) perWeekday[index] += entry.total;
  }
  const weekly: WeeklyAmount[] = perWeekday.map((total, index) => ({
    day: index as WeeklyAmount['day'],
    amount: amount(total, currency),
  }));

  return {
    period: input.period,
    months: input.months ?? 1,
    currency,
    totalSpending: amount(current?.totalExpenses ?? 0, currency),
    changePercent: changePercent(current?.totalExpenses ?? 0, previous?.totalExpenses ?? 0),
    weekly,
    transactionCount: spent?.transactionCount ?? 0,
    budgetUsedPercent: input.budget.percent === null ? null : Math.round(input.budget.percent),
    budgetState: input.budget.state,
    activeSubscriptions: input.subscriptions.count,
    subscriptionsState: input.subscriptions.state,
    savings: amount(current?.net ?? 0, currency),
    cashFlow: buildCashFlow(current, currency),
    heatmap: buildHeatmap(input.period, input.monthDaily.rows, currency),
    heatmapState: input.monthDaily.state,
    savingsTrend: buildSavingsTrend(input.trend.months, currency),
    savingsTrendState: input.trend.state,
    categories: categoryShares(input.comparison.rows, currency),
    categoriesState: input.comparison.state,
    recent: input.recent.items.slice(0, RECENT_COUNT),
    recentState: input.recent.state,
  };
}
