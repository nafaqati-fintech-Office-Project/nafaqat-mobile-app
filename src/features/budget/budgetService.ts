import { isAxiosError } from 'axios';

import * as remote from './budgetApi';
import type { BudgetLimits } from './budgetForm';
import { mockUsage } from './budgetMath';
import { mockBudget } from './mock';
import type { Budget } from './types';
import { AUTH_BYPASS } from '@/config/flags';
import { categoryFromCode } from '@/features/transactions/categoryDisplay';

// The bypass session has no token, so the real endpoints would answer 401; it keeps one budget in memory.

const MOCK_DELAY_MS = 400;
const wait = () => new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

let mock: Budget | null = mockBudget;

export async function getCurrentBudget(): Promise<Budget | null> {
  if (!AUTH_BYPASS) return remote.fetchCurrentBudget();
  await wait();
  return mock;
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
