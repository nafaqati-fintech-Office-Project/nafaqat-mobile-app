import { describe, expect, it, vi } from 'vitest';

import { expenseInstant, recentDays } from './cashExpense';
import { deleteProblem } from './transactionsService';

vi.mock('@/config/flags', () => ({ AUTH_BYPASS: false }));
vi.mock('@/api/client', () => ({ api: {} }));

describe('recentDays', () => {
  it('lists today and the six days before it, across a month end', () => {
    const days = recentDays(new Date(2026, 10, 2, 15, 30));
    expect(days).toHaveLength(7);
    expect(days[0]).toEqual(new Date(2026, 10, 2));
    expect(days[2]).toEqual(new Date(2026, 9, 31));
    expect(days[6]).toEqual(new Date(2026, 9, 27));
  });
});

describe('expenseInstant', () => {
  const now = new Date(2026, 9, 29, 20, 45);

  it('uses the current time for today', () => {
    expect(expenseInstant(new Date(2026, 9, 29), now)).toBe(now.toISOString());
  });

  it('uses midday for an earlier day', () => {
    expect(expenseInstant(new Date(2026, 9, 27), now)).toBe(new Date(2026, 9, 27, 12).toISOString());
  });
});

describe('deleteProblem', () => {
  const refused = (status: number) => Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, response: { status } });

  it('tells the refusals apart', () => {
    expect(deleteProblem(refused(404))).toBe('gone');
    expect(deleteProblem(refused(409))).toBe('notDeletable');
    expect(deleteProblem(refused(500))).toBe('unknown');
    expect(deleteProblem(Object.assign(new Error('Network Error'), { isAxiosError: true }))).toBe('network');
    expect(deleteProblem(new Error('boom'))).toBe('unknown');
  });
});
