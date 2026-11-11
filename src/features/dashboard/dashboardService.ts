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
  RECENT_COUNT,
  todayIn,
  weekDates,
} from './dashboardBuilder';
import { lastMonths } from './heatmapMath';
import { mockDashboard } from './mock';
import type { DashboardData, SectionState } from './types';
import { AUTH_BYPASS, DASHBOARD_MOCK_FAIL } from '@/config/flags';
import { getMonthlyComparison } from '@/features/insights/insightsApi';
import { combineComparisons, lastMonths as periodMonths, type Period } from '@/features/insights/insightsBuilder';
import { fetchTransactionPage } from '@/features/transactions/transactionsApi';

const MOCK_DELAY_MS = 500;

async function getMockDashboard(): Promise<DashboardData> {
  await new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
  if (DASHBOARD_MOCK_FAIL) throw new Error('Mock dashboard failure');
  return mockDashboard;
}

// Preferences only refine currency and time zone, so a failure here never blocks the dashboard.
const optionalPreferences = (): Promise<Preferences | null> => getPreferences().catch(() => null);

const monthKey = ({ year, month }: { year: number; month: number }) => `${year}-${String(month).padStart(2, '0')}`;

// Spending, income, savings, the transaction count and the categories cover the last `months` months,
// ending with the current one; the change is against the same number of months before. The week, the
// month heatmap and the savings trend keep their own time frames.
export async function getDashboard(months: Period = 1): Promise<DashboardData> {
  // The bypass session has no token, so the real endpoints would answer 401.
  if (AUTH_BYPASS) return getMockDashboard();
  if (DASHBOARD_MOCK_FAIL) throw new Error('Mock dashboard failure');

  const preferences = await optionalPreferences();
  const timeZone = preferences?.timezone ?? deviceTimeZone();
  const today = todayIn(timeZone);
  const period = { year: today.year, month: today.month };
  const before = previousMonth(today.year, today.month);
  const week = weekDates(today);

  const covered = periodMonths(today, months);
  const range = {
    startDate: monthRange(covered[0].year, covered[0].month).startDate,
    endDate: monthRange(period.year, period.month).endDate,
  };
  const earlier = periodMonths({ ...before, day: 1 }, months);
  const previousRange = {
    startDate: monthRange(earlier[0].year, earlier[0].month).startDate,
    endDate: monthRange(before.year, before.month).endDate,
  };

  // Core numbers: if any of these fail the dashboard shows its error state.
  const [current, previous, summary, daily] = await Promise.all([
    getIncomeVsExpenses(range, timeZone),
    getIncomeVsExpenses(previousRange, timeZone),
    getSpendingSummary(range, timeZone),
    getDailySpending({ startDate: week[0], endDate: week[6] }, timeZone),
  ]);

  // Optional sections: each one falls back on its own ("Coming soon" tiles, a note in the card).
  const [
    budgetResult,
    subscriptionsResult,
    comparisonResult,
    recentResult,
    monthDailyResult,
    trendResult,
  ] = await Promise.allSettled([
    getCurrentBudget(),
    getActiveSubscriptionCount(),
    Promise.all(covered.map((m) => getMonthlyComparison(monthKey(m), timeZone))).then(combineComparisons),
    fetchTransactionPage({ filter: 'all', search: '', page: 0, size: RECENT_COUNT }),
    getDailySpending(monthRange(period.year, period.month), timeZone),
    Promise.all(
      lastMonths(period.year, period.month).map(async ({ year, month: m }) => ({
        year,
        month: m,
        rows: await getIncomeVsExpenses(monthRange(year, m), timeZone),
      })),
    ),
  ]);
  const state = (result: PromiseSettledResult<unknown>): SectionState =>
    result.status === 'fulfilled' ? 'ready' : 'unavailable';

  return buildDashboard({
    period,
    months,
    preferredCurrency: preferences?.currency ?? null,
    current,
    previous,
    summary,
    daily,
    week,
    monthDaily: {
      state: state(monthDailyResult),
      rows: monthDailyResult.status === 'fulfilled' ? monthDailyResult.value : [],
    },
    trend: {
      state: state(trendResult),
      months: trendResult.status === 'fulfilled' ? trendResult.value : [],
    },
    budget: {
      state: state(budgetResult),
      percent: budgetResult.status === 'fulfilled' ? (budgetResult.value?.percentageUsed ?? null) : null,
    },
    subscriptions: {
      state: state(subscriptionsResult),
      count: subscriptionsResult.status === 'fulfilled' ? subscriptionsResult.value : 0,
    },
    comparison: {
      state: state(comparisonResult),
      rows: comparisonResult.status === 'fulfilled' ? comparisonResult.value : [],
    },
    recent: {
      state: state(recentResult),
      items: recentResult.status === 'fulfilled' ? recentResult.value.items : [],
    },
  });
}
