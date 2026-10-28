import type { DailyEntry, DateRange, IncomeExpenses, SpendingEntry } from './dashboardApi';
import type { DashboardData, SectionState, WeeklyAmount } from './types';
import { currencyDecimals } from '@/utils/money';

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

// The seven dates of the Monday-to-Sunday week that contains `today`.
export function weekDates(today: DateParts): string[] {
  const base = Date.UTC(today.year, today.month - 1, today.day);
  const sinceMonday = (new Date(base).getUTCDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base + (i - sinceMonday) * 86_400_000);
    return isoDate({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() });
  });
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
  preferredCurrency: string | null;
  current: IncomeExpenses[];
  previous: IncomeExpenses[];
  summary: SpendingEntry[];
  daily: DailyEntry[];
  week: string[];
  budget: { state: SectionState; percent: number | null };
  subscriptions: { state: SectionState; count: number };
};

export function buildDashboard(input: BuildInput): DashboardData {
  const currency = pickCurrency(input.preferredCurrency, input.current, input.previous);
  const inCurrency = <T extends { currency: string }>(rows: T[]) =>
    rows.find((row) => row.currency === currency);

  const current = inCurrency(input.current);
  const previous = inCurrency(input.previous);
  const spent = inCurrency(input.summary);
  const days = new Map(inCurrency(input.daily)?.days.map((d) => [d.date, d.total]));

  const weekly: WeeklyAmount[] = input.week.map((date, index) => ({
    day: index as WeeklyAmount['day'],
    amount: amount(days.get(date) ?? 0, currency),
  }));

  return {
    period: input.period,
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
  };
}
