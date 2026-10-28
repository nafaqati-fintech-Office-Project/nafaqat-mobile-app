import { isAxiosError } from 'axios';

import { displayPercent, toneFromStatus } from './budgetMath';
import type { Budget, CategoryBudget } from './types';
import { api } from '@/api/client';
import { arr, decimal, localDate, num, obj, str } from '@/api/parse';
import { categoryFromCode } from '@/features/transactions/categoryDisplay';

function parseCategory(raw: unknown): CategoryBudget {
  const body = obj(raw);
  return {
    category: categoryFromCode(body.category) ?? str(body.category),
    spent: decimal(body.spentAmount),
    limit: decimal(body.limitAmount),
    remaining: decimal(body.remainingAmount),
    percent: displayPercent(num(body.percentageUsed)),
    tone: toneFromStatus(body.usageStatus),
  };
}

export function parseBudget(raw: unknown): Budget {
  const body = obj(raw);
  return {
    id: str(body.id),
    currency: str(body.currency),
    startDate: localDate(body.periodStart),
    endDate: localDate(body.periodEnd),
    spent: decimal(body.totalSpent),
    limit: decimal(body.totalLimit),
    remaining: decimal(body.remainingAmount),
    percent: displayPercent(num(body.percentageUsed)),
    tone: toneFromStatus(body.usageStatus),
    catchingUp: body.catchUpStatus === 'PENDING',
    // Most used first, so the categories that need attention are on top.
    categories: arr(body.categoryLimits ?? [])
      .map(parseCategory)
      .sort((a, b) => b.percent - a.percent),
  };
}

// The active budget for this month. 404 means the user has none yet, which is normal; null stands for it.
export async function fetchCurrentBudget(): Promise<Budget | null> {
  try {
    const { data } = await api.get<unknown>('/api/budgets/current');
    return parseBudget(data);
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}
