import type { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getActiveSubscriptionCount,
  getCurrentBudget,
  getDailySpending,
  getIncomeVsExpenses,
  getPreferences,
  getSpendingSummary,
} from './dashboardApi';

const get = vi.hoisted(() => vi.fn());
vi.mock('@/api/client', () => ({ api: { get } }));

const range = { startDate: '2026-10-01', endDate: '2026-10-31' };
// What axios throws for an HTTP error: isAxiosError is the flag its own isAxiosError() checks.
const status = (code: number) =>
  Object.assign(new Error(`HTTP ${code}`), { isAxiosError: true, response: { status: code } });

beforeEach(() => {
  get.mockReset();
});

describe('report calls', () => {
  it('sends the date range and time zone, and parses income vs expenses', async () => {
    get.mockResolvedValue({
      data: { currencies: [{ currency: 'PKR', totalIncome: 12000, totalExpenses: '4250.5', net: 7749.5 }] },
    });
    expect(await getIncomeVsExpenses(range, 'Asia/Karachi')).toEqual([
      { currency: 'PKR', totalIncome: 12000, totalExpenses: 4250.5, net: 7749.5 },
    ]);
    expect(get).toHaveBeenCalledWith('/api/reports/income-vs-expenses', {
      params: { ...range, timeZone: 'Asia/Karachi' },
    });
  });

  it('parses the spending summary and the daily series', async () => {
    get.mockResolvedValueOnce({
      data: { currencies: [{ currency: 'PKR', totalSpent: 10, transactionCount: 2, categories: [] }] },
    });
    expect(await getSpendingSummary(range, 'UTC')).toEqual([
      { currency: 'PKR', totalSpent: 10, transactionCount: 2 },
    ]);
    get.mockResolvedValueOnce({
      data: { currencies: [{ currency: 'PKR', days: [{ date: '2026-10-26', total: 5, count: 1 }] }] },
    });
    expect(await getDailySpending(range, 'UTC')).toEqual([
      { currency: 'PKR', days: [{ date: '2026-10-26', total: 5 }] },
    ]);
  });

  it('rejects a response with an unexpected shape', async () => {
    get.mockResolvedValue({ data: { currencies: [{ currency: 'PKR', totalIncome: 'many' }] } });
    await expect(getIncomeVsExpenses(range, 'UTC')).rejects.toThrow('Invalid number');
    get.mockResolvedValue({ data: 'oops' });
    await expect(getSpendingSummary(range, 'UTC')).rejects.toThrow('Invalid object');
  });
});

describe('budget, subscriptions and preferences', () => {
  it('reads the used percentage of the current budget', async () => {
    get.mockResolvedValue({ data: { currency: 'PKR', percentageUsed: 64.6, totalLimit: 5000 } });
    expect(await getCurrentBudget()).toEqual({ currency: 'PKR', percentageUsed: 64.6 });
  });

  it('treats a 404 as "none"', async () => {
    get.mockRejectedValue(status(404));
    expect(await getCurrentBudget()).toBeNull();
    expect(await getPreferences()).toBeNull();
  });

  it('still fails on other errors', async () => {
    const statusOf = (call: () => Promise<unknown>) =>
      call().then(
        () => 0,
        (error: unknown) => (error as AxiosError).response?.status ?? -1,
      );
    get.mockRejectedValue(status(503));
    expect(await statusOf(getCurrentBudget)).toBe(503);
    expect(await statusOf(getPreferences)).toBe(503);
  });

  it('counts confirmed subscriptions', async () => {
    get.mockResolvedValue({ data: { countsByStatus: { CONFIRMED: 4, DETECTED: 2 } } });
    expect(await getActiveSubscriptionCount()).toBe(4);
    get.mockResolvedValue({ data: { countsByStatus: {} } });
    expect(await getActiveSubscriptionCount()).toBe(0);
  });

  it('reads currency and time zone from the preferences', async () => {
    get.mockResolvedValue({ data: { currency: 'PKR', timezone: 'Asia/Karachi', language: 'en' } });
    expect(await getPreferences()).toEqual({ currency: 'PKR', timezone: 'Asia/Karachi' });
  });
});
