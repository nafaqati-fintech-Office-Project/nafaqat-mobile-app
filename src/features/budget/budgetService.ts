import { isAxiosError } from 'axios';

import * as remote from './budgetApi';
import type { BudgetLimits } from './budgetForm';
import { mockUsage } from './budgetMath';
import { mockBudget } from './mock';
import type { Budget } from './types';
import { AUTH_BYPASS } from '@/config/flags';
import { getPreferences } from '@/features/dashboard/dashboardApi';
import { deviceTimeZone, todayIn } from '@/features/dashboard/dashboardBuilder';
import { getMonthlyComparison } from '@/features/insights/insightsApi';
import { combineComparisons, lastMonths, type Period } from '@/features/insights/insightsBuilder';
import { categoryFromCode } from '@/features/transactions/categoryDisplay';
import { currencyDecimals } from '@/utils/money';

// The bypass session has no token, so the real endpoints would answer 401; it keeps one budget in memory.

const MOCK_DELAY_MS = 400;
const wait = () => new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

let mock: Budget | null = mockBudget;

export async function getCurrentBudget(): Promise<Budget | null> {
  if (!AUTH_BYPASS) return remote.fetchCurrentBudget();
  await wait();
  return mock;
}

const monthKey = ({ year, month }: { year: number; month: number }) => `${year}-${String(month).padStart(2, '0')}`;

// The budget over the last `months` months: what was spent in them against the monthly limits times
// `months`. One month is the current budget as it is.
export async function getBudgetForPeriod(months: Period): Promise<Budget | null> {
  const budget = await getCurrentBudget();
  if (!budget || months === 1 || AUTH_BYPASS) return budget;

  const preferences = await getPreferences().catch(() => null);
  const timeZone = preferences?.timezone ?? deviceTimeZone();
  const covered = lastMonths(todayIn(timeZone), months);
  const comparisons = await Promise.all(covered.map((m) => getMonthlyComparison(monthKey(m), timeZone)));
  const spending = combineComparisons(comparisons).find((c) => c.currency === budget.currency)?.current;
  const spentBy = new Map((spending?.categories ?? []).map((c) => [categoryFromCode(c.code) ?? c.label, c.total]));

  const decimals = currencyDecimals(budget.currency);
  const usage = (spent: number, limit: number) => {
    const spentText = spent.toFixed(decimals);
    const limitText = (limit * months).toFixed(decimals);
    return { spent: spentText, limit: limitText, ...mockUsage(spentText, limitText) };
  };
  return {
    ...budget,
    months,
    startDate: new Date(covered[0].year, covered[0].month - 1, 1),
    ...usage(spending?.expenses ?? 0, Number(budget.limit)),
    categories: budget.categories
      .map((c) => ({ category: c.category, ...usage(spentBy.get(c.category) ?? 0, Number(c.limit)) }))
      .sort((a, b) => b.percent - a.percent),
  };
}

// Sample spending per category, so a budget made in bypass mode is not all zero.
const mockSpent = (category: string) =>
  mockBudget.categories.find((c) => c.category === category)?.spent ?? '0';

function mockFrom(base: Omit<Budget, 'spent' | 'limit' | 'remaining' | 'percent' | 'tone' | 'categories'>, limits: BudgetLimits): Budget {
  const categories = limits.categoryLimits.map(({ category, limitAmount }) => {
    const name = categoryFromCode(category) ?? category;
    const spent = mockSpent(name);
    return { category: name, spent, limit: String(limitAmount), ...mockUsage(spent, String(limitAmount)) };
  });
  return {
    ...base,
    spent: mockBudget.spent,
    limit: String(limits.totalLimit),
    ...mockUsage(mockBudget.spent, String(limits.totalLimit)),
    categories: categories.sort((a, b) => b.percent - a.percent),
  };
}

export async function createBudget(body: remote.NewBudget): Promise<Budget> {
  if (!AUTH_BYPASS) return remote.createBudget(body);
  await wait();
  const [y, m] = body.periodStart.split('-').map(Number);
  mock = mockFrom(
    { id: 'mock', currency: body.currency, startDate: new Date(y, m - 1, 1), endDate: new Date(y, m, 0), catchingUp: false },
    body,
  );
  return mock;
}

export async function updateBudget(id: string, body: BudgetLimits): Promise<Budget> {
  if (!AUTH_BYPASS) return remote.updateBudget(id, body);
  await wait();
  if (!mock) throw new Error('No budget');
  mock = mockFrom(mock, body);
  return mock;
}

export async function archiveBudget(id: string): Promise<void> {
  if (!AUTH_BYPASS) return remote.archiveBudget(id);
  await wait();
  mock = null;
}

export type SaveProblem = 'exists' | 'archived' | 'overTotal' | 'network' | 'unknown';

// What went wrong with a save, from the budget service's answer (error shape E5: status and message).
export function saveProblem(error: unknown): SaveProblem {
  if (!isAxiosError(error)) return 'unknown';
  const status = error.response?.status;
  if (status === undefined) return 'network';
  const data: unknown = error.response?.data;
  const message =
    typeof data === 'object' && data !== null && 'message' in data && typeof data.message === 'string'
      ? data.message.toLowerCase()
      : '';
  if (status === 409 && message.includes('archived')) return 'archived';
  if (status === 409 && message.includes('already exists')) return 'exists';
  if (status === 400 && message.includes('exceeds the total')) return 'overTotal';
  return 'unknown';
}
