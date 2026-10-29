import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as dashboardApi from './dashboardApi';
import { getDashboard } from './dashboardService';
import * as insightsApi from '@/features/insights/insightsApi';
import * as transactionsApi from '@/features/transactions/transactionsApi';

vi.mock('./dashboardApi', () => ({
  getPreferences: vi.fn(),
  getIncomeVsExpenses: vi.fn(),
  getSpendingSummary: vi.fn(),
  getDailySpending: vi.fn(),
  getCurrentBudget: vi.fn(),
  getActiveSubscriptionCount: vi.fn(),
}));
vi.mock('@/config/flags', () => ({ AUTH_BYPASS: false, DASHBOARD_MOCK_FAIL: false }));
vi.mock('@/features/insights/insightsApi', () => ({ getMonthlyComparison: vi.fn() }));
vi.mock('@/features/transactions/transactionsApi', () => ({ fetchTransactionPage: vi.fn() }));

const api = vi.mocked(dashboardApi);
const reports = vi.mocked(insightsApi);
const transactions = vi.mocked(transactionsApi);

beforeEach(() => {
  vi.resetAllMocks();
  api.getPreferences.mockResolvedValue({ currency: 'PKR', timezone: 'Asia/Karachi' });
  api.getIncomeVsExpenses.mockResolvedValue([
    { currency: 'PKR', totalIncome: 1000, totalExpenses: 400, net: 600 },
  ]);
  api.getSpendingSummary.mockResolvedValue([{ currency: 'PKR', totalSpent: 400, transactionCount: 5 }]);
  api.getDailySpending.mockResolvedValue([{ currency: 'PKR', days: [] }]);
  api.getCurrentBudget.mockResolvedValue({ currency: 'PKR', percentageUsed: 40 });
  api.getActiveSubscriptionCount.mockResolvedValue(2);
  reports.getMonthlyComparison.mockResolvedValue([
    {
      currency: 'PKR',
      current: { income: 1000, expenses: 400, net: 600, categories: [{ code: 'GROCERIES', label: 'Groceries', total: 400 }] },
      previous: { income: 0, expenses: 0, net: 0, categories: [] },
      netChangePercent: null,
      categoryChanges: [],
    },
  ]);
  transactions.fetchTransactionPage.mockResolvedValue({ items: [], page: 0, hasMore: false });
});

describe('getDashboard', () => {
  it('assembles the dashboard from the backend calls', async () => {
    const data = await getDashboard();
    expect(data).toMatchObject({
      currency: 'PKR',
      totalSpending: '400.00',
      transactionCount: 5,
      budgetUsedPercent: 40,
      budgetState: 'ready',
      activeSubscriptions: 2,
      subscriptionsState: 'ready',
      savings: '600.00',
    });
    // current month, previous month, summary and the week all use the user's time zone
    for (const call of [
      ...api.getIncomeVsExpenses.mock.calls,
      ...api.getSpendingSummary.mock.calls,
      ...api.getDailySpending.mock.calls,
    ]) {
      expect(call[1]).toBe('Asia/Karachi');
    }
    expect(api.getIncomeVsExpenses).toHaveBeenCalledTimes(2);
  });

  it('shows "Coming soon" tiles when budget and subscriptions are unreachable', async () => {
    api.getCurrentBudget.mockRejectedValue(new Error('503'));
    api.getActiveSubscriptionCount.mockRejectedValue(new Error('503'));
    const data = await getDashboard();
    expect(data.budgetState).toBe('unavailable');
    expect(data.subscriptionsState).toBe('unavailable');
    expect(data.totalSpending).toBe('400.00'); // the core numbers still show
  });

  it('keeps "no budget" separate from an unavailable budget', async () => {
    api.getCurrentBudget.mockResolvedValue(null);
    const data = await getDashboard();
    expect(data).toMatchObject({ budgetUsedPercent: null, budgetState: 'ready' });
  });

  it('still loads when the preferences cannot be read', async () => {
    api.getPreferences.mockRejectedValue(new Error('down'));
    const data = await getDashboard();
    expect(data.currency).toBe('PKR');
  });

  it('loads this month\'s categories and the newest transactions', async () => {
    const data = await getDashboard();
    expect(data.categories).toEqual([{ category: 'Groceries', amount: '400.00', percent: 100 }]);
    expect(reports.getMonthlyComparison).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}$/), 'Asia/Karachi');
    expect(transactions.fetchTransactionPage).toHaveBeenCalledWith({ filter: 'all', search: '', page: 0, size: 5 });
    expect(data).toMatchObject({ categoriesState: 'ready', recentState: 'ready' });
  });

  it('still shows the dashboard when the categories or recent transactions fail', async () => {
    reports.getMonthlyComparison.mockRejectedValue(new Error('503'));
    transactions.fetchTransactionPage.mockRejectedValue(new Error('503'));
    const data = await getDashboard();
    expect(data).toMatchObject({ totalSpending: '400.00', categoriesState: 'unavailable', recentState: 'unavailable' });
  });

  it('fails (error state) when a core report fails', async () => {
    api.getSpendingSummary.mockRejectedValue(new Error('502'));
    await expect(getDashboard()).rejects.toThrow('502');
  });
});
