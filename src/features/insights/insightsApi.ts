import { api } from '@/api/client';
import { arr, num, obj, str } from '@/api/parse';
import type { DateRange } from '@/features/dashboard/dashboardApi';
import { parseTransactionPage, type TransactionItem } from '@/features/transactions/transactionsApi';

// Report amounts arrive as JSON numbers with 4 decimals, as on the dashboard.
export type MonthTrend = { month: string; expenses: number; net: number };
export type CurrencyTrend = { currency: string; months: MonthTrend[] };

export type MonthCategory = { code: string | null; label: string; total: number };
export type MonthTotals = { income: number; expenses: number; net: number; categories: MonthCategory[] };
export type CategoryChange = { code: string | null; label: string; percent: number | null };
export type CurrencyComparison = {
  currency: string;
  current: MonthTotals;
  previous: MonthTotals;
  netChangePercent: number | null;
  categoryChanges: CategoryChange[];
};

const optionalNum = (value: unknown) => (value === null || value === undefined ? null : num(value));
const optionalStr = (value: unknown) => (typeof value === 'string' && value ? value : null);
const currencies = (body: unknown) => arr(obj(body).currencies).map(obj);

// endMonth is YYYY-MM; the service returns `months` entries per currency, oldest first, zero-filled.
export async function getMonthlyTrend(endMonth: string, months: number, timeZone: string): Promise<CurrencyTrend[]> {
  const { data } = await api.get<unknown>('/api/reports/monthly-trend', { params: { endMonth, months, timeZone } });
  return currencies(data).map((c) => ({
    currency: str(c.currency),
    months: arr(c.months)
      .map(obj)
      .map((m) => ({ month: str(m.month), expenses: num(m.totalExpenses), net: num(m.net) })),
  }));
}

function monthTotals(raw: unknown): MonthTotals {
  const body = obj(raw);
  return {
    income: num(body.totalIncome),
    expenses: num(body.totalExpenses),
    net: num(body.net),
    categories: arr(body.categories ?? [])
      .map(obj)
      .map((c) => ({ code: optionalStr(c.categoryCode), label: str(c.category), total: num(c.total) })),
  };
}

// The month (YYYY-MM) against the month before it, per currency.
export async function getMonthlyComparison(month: string, timeZone: string): Promise<CurrencyComparison[]> {
  const { data } = await api.get<unknown>('/api/reports/monthly-comparison', { params: { month, timeZone } });
  return currencies(data).map((c) => {
    const delta = obj(c.delta);
    return {
      currency: str(c.currency),
      current: monthTotals(c.current),
      previous: monthTotals(c.previous),
      netChangePercent: optionalNum(obj(delta.net).percent),
      categoryChanges: arr(delta.categories ?? [])
        .map(obj)
        .map((d) => ({ code: optionalStr(d.categoryCode), label: str(d.category), percent: optionalNum(d.percent) })),
    };
  });
}

// There is no personal merchant report, so merchants are totalled from the month's spending rows.
const PAGE_SIZE = 100;
const MAX_PAGES = 5;

export type SpendingRows = { rows: TransactionItem[]; truncated: boolean };

export async function getSpendingRows(range: DateRange, timeZone: string): Promise<SpendingRows> {
  const rows: TransactionItem[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data } = await api.get<unknown>('/api/transactions', {
      params: { type: 'DEBIT', status: 'COMPLETED', ...range, timeZone, sort: 'transactionDate,desc', page, size: PAGE_SIZE },
    });
    const result = parseTransactionPage(data);
    rows.push(...result.items);
    if (!result.hasMore) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}
