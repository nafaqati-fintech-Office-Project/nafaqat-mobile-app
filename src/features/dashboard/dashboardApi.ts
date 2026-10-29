import { isAxiosError } from 'axios';

import { api } from '@/api/client';
import { arr, num, obj, str } from '@/api/parse';
import { AUTH_BYPASS } from '@/config/flags';

export type DateRange = { startDate: string; endDate: string };

export type IncomeExpenses = { currency: string; totalIncome: number; totalExpenses: number; net: number };
export type SpendingEntry = { currency: string; totalSpent: number; transactionCount: number };
export type DailyEntry = { currency: string; days: { date: string; total: number }[] };
export type BudgetInfo = { currency: string; percentageUsed: number };
export type Preferences = { currency: string; timezone: string };

const currencies = (body: unknown) => arr(obj(body).currencies).map(obj);

// timeZone is an IANA id such as Asia/Karachi; the reports bucket days in that zone.
const reportParams = ({ startDate, endDate }: DateRange, timeZone: string) => ({
  startDate,
  endDate,
  timeZone,
});

export async function getIncomeVsExpenses(range: DateRange, timeZone: string): Promise<IncomeExpenses[]> {
  const { data } = await api.get<unknown>('/api/reports/income-vs-expenses', {
    params: reportParams(range, timeZone),
  });
  return currencies(data).map((c) => ({
    currency: str(c.currency),
    totalIncome: num(c.totalIncome),
    totalExpenses: num(c.totalExpenses),
    net: num(c.net),
  }));
}

export async function getSpendingSummary(range: DateRange, timeZone: string): Promise<SpendingEntry[]> {
  const { data } = await api.get<unknown>('/api/reports/spending-summary', {
    params: reportParams(range, timeZone),
  });
  return currencies(data).map((c) => ({
    currency: str(c.currency),
    totalSpent: num(c.totalSpent),
    transactionCount: num(c.transactionCount),
  }));
}

export async function getDailySpending(range: DateRange, timeZone: string): Promise<DailyEntry[]> {
  const { data } = await api.get<unknown>('/api/reports/daily-spending', {
    params: reportParams(range, timeZone),
  });
  return currencies(data).map((c) => ({
    currency: str(c.currency),
    days: arr(c.days).map(obj).map((d) => ({ date: str(d.date), total: num(d.total) })),
  }));
}

// 404 means "no active budget this month", which is normal; null stands for it.
export async function getCurrentBudget(): Promise<BudgetInfo | null> {
  try {
    const { data } = await api.get<unknown>('/api/budgets/current');
    const body = obj(data);
    return { currency: str(body.currency), percentageUsed: num(body.percentageUsed) };
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

// Number of subscriptions the user has confirmed.
export async function getActiveSubscriptionCount(): Promise<number> {
  const { data } = await api.get<unknown>('/api/subscriptions/summary');
  return num(obj(obj(data).countsByStatus).CONFIRMED ?? 0);
}

// 404 means the user has not saved preferences yet (normal for a new account).
export async function getPreferences(): Promise<Preferences | null> {
  // The bypass session has no token and often no gateway: without this the screens that wait for it
  // (subscriptions, budget, insights) sit until the request times out.
  if (AUTH_BYPASS) return null;
  try {
    const { data } = await api.get<unknown>('/api/users/me/preferences');
    const body = obj(data);
    return { currency: str(body.currency), timezone: str(body.timezone) };
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}
