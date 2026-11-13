import { getMonthlyComparison, getMonthlyTrend, getSpendingRows } from './insightsApi';
import { buildInsights, combineComparisons, FREE_INSIGHT_MONTHS, lastMonths, TREND_MONTHS, type Period } from './insightsBuilder';
import { mockInsights } from './mock';
import type { Insights } from './types';
import { AUTH_BYPASS } from '@/config/flags';
import { getPreferences } from '@/features/dashboard/dashboardApi';
import { deviceTimeZone, monthRange, todayIn } from '@/features/dashboard/dashboardBuilder';

const MOCK_DELAY_MS = 400;

const monthKey = ({ year, month }: { year: number; month: number }) => `${year}-${String(month).padStart(2, '0')}`;

// The numbers cover the last `months` months, ending with the current one. `extended` (Premium) allows every period and
// the 12-month trend; on the Free plan both stop at FREE_INSIGHT_MONTHS.
export async function getInsights(requested: Period = 1, extended = true): Promise<Insights> {
  const months = (extended ? requested : Math.min(requested, FREE_INSIGHT_MONTHS)) as Period;
  const trendMonths = extended ? TREND_MONTHS : FREE_INSIGHT_MONTHS;
  // The bypass session has no token, so the real endpoints would answer 401.
  if (AUTH_BYPASS) {
    await new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
    return mockInsights;
  }

  // Preferences only refine currency and time zone, so a failure here never blocks the screen.
  const preferences = await getPreferences().catch(() => null);
  const timeZone = preferences?.timezone ?? deviceTimeZone();
  const today = todayIn(timeZone);
  const period = lastMonths(today, months);
  const range = {
    startDate: monthRange(period[0].year, period[0].month).startDate,
    endDate: monthRange(today.year, today.month).endDate,
  };

  // The reports are the screen: if either fails it shows its error state. Merchants are a bonus.
  const [trend, comparisons, spending] = await Promise.all([
    getMonthlyTrend(monthKey(today), trendMonths, timeZone),
    Promise.all(period.map((m) => getMonthlyComparison(monthKey(m), timeZone))),
    getSpendingRows(range, timeZone).catch(() => null),
  ]);

  return buildInsights({
    today,
    preferredCurrency: preferences?.currency ?? null,
    trend,
    comparison: combineComparisons(comparisons),
    spending,
    months,
    trendMonths,
  });
}
