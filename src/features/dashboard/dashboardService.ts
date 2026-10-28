import {
  getActiveSubscriptionCount,
  getCurrentBudget,
  getDailySpending,
  getIncomeVsExpenses,
  getPreferences,
  getSpendingSummary,
  type Preferences,
} from './dashboardApi';
import {
  buildDashboard,
  deviceTimeZone,
  monthRange,
  previousMonth,
  todayIn,
  weekDates,
} from './dashboardBuilder';
import { mockDashboard } from './mock';
import type { DashboardData, SectionState } from './types';
import { AUTH_BYPASS, DASHBOARD_MOCK_FAIL } from '@/config/flags';

const MOCK_DELAY_MS = 500;

async function getMockDashboard(): Promise<DashboardData> {
  await new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
  if (DASHBOARD_MOCK_FAIL) throw new Error('Mock dashboard failure');
  return mockDashboard;
}

// Preferences only refine currency and time zone, so a failure here never blocks the dashboard.
const optionalPreferences = (): Promise<Preferences | null> => getPreferences().catch(() => null);

export async function getDashboard(): Promise<DashboardData> {
  // The bypass session has no token, so the real endpoints would answer 401.
  if (AUTH_BYPASS) return getMockDashboard();
  if (DASHBOARD_MOCK_FAIL) throw new Error('Mock dashboard failure');

  const preferences = await optionalPreferences();
  const timeZone = preferences?.timezone ?? deviceTimeZone();
  const today = todayIn(timeZone);
  const period = { year: today.year, month: today.month };
  const before = previousMonth(today.year, today.month);
  const week = weekDates(today);

  // Core numbers: if any of these fail the dashboard shows its error state.
  const [current, previous, summary, daily] = await Promise.all([
    getIncomeVsExpenses(monthRange(period.year, period.month), timeZone),
    getIncomeVsExpenses(monthRange(before.year, before.month), timeZone),
    getSpendingSummary(monthRange(period.year, period.month), timeZone),
    getDailySpending({ startDate: week[0], endDate: week[6] }, timeZone),
  ]);

  // Optional tiles: each one falls back to "Coming soon" on its own.
  const [budgetResult, subscriptionsResult] = await Promise.allSettled([
    getCurrentBudget(),
    getActiveSubscriptionCount(),
  ]);
  const state = (result: PromiseSettledResult<unknown>): SectionState =>
    result.status === 'fulfilled' ? 'ready' : 'unavailable';

  return buildDashboard({
    period,
    preferredCurrency: preferences?.currency ?? null,
    current,
    previous,
    summary,
    daily,
    week,
    budget: {
      state: state(budgetResult),
      percent: budgetResult.status === 'fulfilled' ? (budgetResult.value?.percentageUsed ?? null) : null,
    },
    subscriptions: {
      state: state(subscriptionsResult),
      count: subscriptionsResult.status === 'fulfilled' ? subscriptionsResult.value : 0,
    },
  });
}
