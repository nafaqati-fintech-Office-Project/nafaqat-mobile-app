import type {
  BiggestExpense,
  Change,
  DebtSummary,
  LifestyleGroup,
  LifestyleShare,
  MoneyMovement,
  PaymentMethod,
  Report,
  ReportCategory,
  ReportRow,
  WeekSpending,
} from './types';
import { lastMonths, savingsRate } from '@/features/dashboard/heatmapMath';
import type { CurrencyComparison, CurrencyTrend, MonthTotals, SpendingRows } from '@/features/insights/insightsApi';
import { changeOf, merchantTotals } from '@/features/insights/insightsBuilder';
import { categoryFromCode } from '@/features/transactions/categoryDisplay';
import type { TransactionItem } from '@/features/transactions/transactionsApi';
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
const LIFESTYLE = new Set([
  'Food & Beverage',
  'Clothing & Shopping',
  'Entertainment',
  'Travel',
  'Subscriptions',
  'Personal Care & Leisure',
]);

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

// Money moved between the person's own accounts is not spending, so it is left out of every list below.
const OWN_ACCOUNT = 'Internal Transfers';
const TRANSFERS = 'Transfers';
const CASH = 'Cash Withdrawals';
const LOANS = 'Loans/EMI';
const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Spending week by week (weeks start on Sunday), from the month's rows. Transfers to other people are not
// everyday spending, so they are left out here.
export function weeklySpending(
  rows: TransactionItem[],
  period: { year: number; month: number },
  currency: string,
): WeekSpending[] {
  const first = new Date(period.year, period.month - 1, 1);
  const last = new Date(period.year, period.month, 0);
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (row.category === TRANSFERS) continue;
    const start = new Date(row.date.getFullYear(), row.date.getMonth(), row.date.getDate() - row.date.getDay());
    const key = dayKey(start);
    totals.set(key, (totals.get(key) ?? 0) + Number(row.amount));
  }
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, total]) => {
      const [y, m, d] = key.split('-').map(Number);
      const start = new Date(y, m - 1, d);
      const end = new Date(start.getTime() + 6 * DAY_MS);
      return { start: key, amount: amount(total, currency), partial: start < first || end > last };
    });
}

// Everyday spending by the card it was paid with, read from the description the sync stored
// ("<bank> · card ****1234"). Payments with no card in the description are grouped together.
export function paymentMethods(rows: TransactionItem[], currency: string): PaymentMethod[] {
  const groups = new Map<string | null, { total: number; count: number }>();
  for (const row of rows) {
    if (row.category === TRANSFERS) continue;
    const card = /\*{4}\s*(\d{4})/.exec(row.description ?? '')?.[1] ?? null;
    const group = groups.get(card) ?? { total: 0, count: 0 };
    group.total += Number(row.amount);
    group.count += 1;
    groups.set(card, group);
  }
  const whole = [...groups.values()].reduce((total, g) => total + g.total, 0);
  return [...groups.entries()]
    .sort(([, a], [, b]) => b.total - a.total)
    .map(([card, g]) => ({ card, amount: amount(g.total, currency), count: g.count, percent: percentOf(g.total, whole) }));
}

const categoryTotal = (categories: ReportCategory[], name: string) =>
  Number(categories.find((c) => c.category === name)?.amount ?? 0);

// Everyday spending against transfers to others (money that left, purpose unknown) and cash taken out.
export function moneyMovement(categories: ReportCategory[], spent: number, income: number, currency: string): MoneyMovement {
  const transfers = categoryTotal(categories, TRANSFERS);
  return {
    dayToDay: amount(Math.max(spent - transfers, 0), currency),
    transfers: amount(transfers, currency),
    cash: amount(categoryTotal(categories, CASH), currency),
    income: amount(income, currency),
  };
}

export function debtSummary(categories: ReportCategory[], spent: number, income: number, currency: string): DebtSummary {
  const loans = categoryTotal(categories, LOANS);
  return {
    loans: amount(loans, currency),
    percentOfIncome: income > 0 ? percentOf(loans, income) : null,
    percentOfSpending: percentOf(loans, spent),
  };
}

export const reportRows = (rows: TransactionItem[]): ReportRow[] =>
  rows.map((r) => ({
    date: r.date.toISOString(),
    merchant: r.merchant ?? '',
    description: r.description ?? '',
    category: r.category,
    amount: r.amount,
  }));

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
  // Own-account moves are not spending, so no list or count in the report includes them.
  const clean = spending && { ...spending, rows: spending.rows.filter((r) => r.category !== OWN_ACCOUNT) };
  const rows = clean?.rows.filter((r) => r.currency === currency);
  const categories = reportCategories(current, currency);

  return {
    period,
    currency,
    spent: amount(spent, currency),
    income: amount(income, currency),
    net: amount(net, currency),
    avgDaily: amount(daysCounted > 0 ? spent / daysCounted : 0, currency),
    savingsRate: savingsRate(income, net),
    categories,
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
    biggest: clean ? biggestExpense(clean, currency) : null,
    merchants: clean ? merchantTotals(clean, currency) : [],
    merchantsState: spending ? 'ready' : 'unavailable',
    merchantsTruncated: spending?.truncated ?? false,
    weeks: rows ? weeklySpending(rows, period, currency) : [],
    paymentMethods: rows ? paymentMethods(rows, currency) : [],
    rows: rows ? reportRows(rows) : [],
    movement: moneyMovement(categories, spent, income, currency),
    debt: debtSummary(categories, spent, income, currency),
  };
}
