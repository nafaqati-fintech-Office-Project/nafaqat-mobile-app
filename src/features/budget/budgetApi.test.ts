import { beforeEach, describe, expect, it, vi } from 'vitest';

import { archiveBudget, createBudget, fetchCurrentBudget, parseBudget, updateBudget } from './budgetApi';
import { saveProblem } from './budgetService';

const { get, post, put, patch } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() }));
vi.mock('@/api/client', () => ({ api: { get, post, put, patch } }));
vi.mock('@/config/flags', () => ({ AUTH_BYPASS: false }));

const status = (code: number) =>
  Object.assign(new Error(`HTTP ${code}`), { isAxiosError: true, response: { status: code } });

// A BudgetResponse as the budget service sends it.
const body = (overrides: Record<string, unknown> = {}) => ({
  id: 'b7c1',
  userId: 'u1',
  periodStart: '2026-10-01',
  periodEnd: '2026-10-31',
  timeZone: 'Asia/Karachi',
  currency: 'SAR',
  totalLimit: 6000,
  totalSpent: 4250.5,
  remainingAmount: 1749.5,
  percentageUsed: 70.84,
  usageStatus: 'ON_TRACK',
  status: 'ACTIVE',
  catchUpStatus: 'DONE',
  categoryLimits: [
    {
      category: 'FOOD_AND_BEVERAGE',
      limitAmount: 1200,
      spentAmount: 935,
      remainingAmount: 265,
      percentageUsed: 77.91,
      usageStatus: 'ON_TRACK',
    },
    {
      category: 'GROCERIES',
      limitAmount: 1250,
      spentAmount: 1274,
      remainingAmount: -24,
      percentageUsed: 101.92,
      usageStatus: 'EXCEEDED',
    },
  ],
  createdAt: '2026-10-01T09:00:00',
  updatedAt: '2026-10-28T12:00:00',
  ...overrides,
});

beforeEach(() => {
  get.mockReset();
});

describe('parseBudget', () => {
  it('maps totals, the month and the service usage', () => {
    const budget = parseBudget(body());
    expect(budget).toMatchObject({
      id: 'b7c1',
      currency: 'SAR',
      spent: '4250.5',
      limit: '6000',
      remaining: '1749.5',
      percent: 70,
      tone: 'ok',
      catchingUp: false,
    });
    expect(budget.startDate).toEqual(new Date(2026, 9, 1));
    expect(budget.endDate).toEqual(new Date(2026, 9, 31));
  });

  it('names categories the app way and puts the most used first', () => {
    const [first, second] = parseBudget(body()).categories;
    expect(first).toEqual({
      category: 'Groceries',
      spent: '1274',
      limit: '1250',
      remaining: '-24',
      percent: 101,
      tone: 'over',
    });
    expect(second.category).toBe('Food & Beverage');
    expect(second.tone).toBe('ok');
  });

  it('keeps string decimals and flags a catch-up in progress', () => {
    const budget = parseBudget(body({ totalSpent: '4250.5000', catchUpStatus: 'PENDING', categoryLimits: [] }));
    expect(budget.spent).toBe('4250.5000');
    expect(budget.catchingUp).toBe(true);
    expect(budget.categories).toEqual([]);
  });

  it('rejects a malformed month', () => {
    expect(() => parseBudget(body({ periodStart: '01/10/2026' }))).toThrow();
  });
});

describe('fetchCurrentBudget', () => {
  it('reads the current budget', async () => {
    get.mockResolvedValue({ data: body() });
    await expect(fetchCurrentBudget()).resolves.toMatchObject({ id: 'b7c1' });
    expect(get).toHaveBeenCalledWith('/api/budgets/current');
  });

  it('treats 404 as no budget yet', async () => {
    get.mockRejectedValue(status(404));
    await expect(fetchCurrentBudget()).resolves.toBeNull();
  });

  it('lets other failures through', async () => {
    get.mockRejectedValue(status(500));
    await expect(fetchCurrentBudget()).rejects.toThrow('HTTP 500');
  });
});

describe('saving a budget', () => {
  const limits = { totalLimit: 5000, categoryLimits: [{ category: 'GROCERIES', limitAmount: 1500 }] };

  it('creates the month with the user, period, currency and time zone', async () => {
    post.mockResolvedValue({ data: body() });
    const newBudget = {
      ...limits,
      userId: 'u1',
      periodStart: '2026-10-01',
      periodEnd: '2026-10-31',
      currency: 'SAR',
      timeZone: 'Asia/Riyadh',
    };
    expect((await createBudget(newBudget)).id).toBe('b7c1');
    expect(post).toHaveBeenCalledWith('/api/budgets', newBudget);
  });

  it('replaces the limits of a budget, and archives one', async () => {
    put.mockResolvedValue({ data: body() });
    patch.mockResolvedValue({ data: null });
    await updateBudget('b/1', limits);
    await archiveBudget('b7c1');
    expect(put).toHaveBeenCalledWith('/api/budgets/b%2F1', limits);
    expect(patch).toHaveBeenCalledWith('/api/budgets/b7c1/archive');
  });
});

describe('saveProblem', () => {
  const refused = (code: number, message: string) =>
    Object.assign(new Error(`HTTP ${code}`), { isAxiosError: true, response: { status: code, data: { message } } });

  it('tells the budget service refusals apart', () => {
    expect(saveProblem(refused(409, 'An active budget already exists for this month'))).toBe('exists');
    expect(saveProblem(refused(409, 'Archived budgets cannot be modified'))).toBe('archived');
    expect(saveProblem(refused(409, 'The budget was modified concurrently; please retry'))).toBe('unknown');
    expect(saveProblem(refused(400, 'Sum of category limits exceeds the total budget limit'))).toBe('overTotal');
    expect(saveProblem(Object.assign(new Error('Network Error'), { isAxiosError: true }))).toBe('network');
    expect(saveProblem(new Error('boom'))).toBe('unknown');
  });
});
