import { getMonthlyComparison, getMonthlyTrend, getSpendingRows } from './insightsApi';
import { buildInsights, TREND_MONTHS } from './insightsBuilder';
import { mockInsights } from './mock';
import type { Insights } from './types';
import { AUTH_BYPASS } from '@/config/flags';
import { getPreferences } from '@/features/dashboard/dashboardApi';
import { deviceTimeZone, monthRange, todayIn } from '@/features/dashboard/dashboardBuilder';

const MOCK_DELAY_MS = 400;

export async function getInsights(): Promise<Insights> {
  // The bypass session has no token, so the real endpoints would answer 401.
  if (AUTH_BYPASS) {
    await new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
    return mockInsights;
  }

  // Preferences only refine currency and time zone, so a failure here never blocks the screen.
  const preferences = await getPreferences().catch(() => null);
  const timeZone = preferences?.timezone ?? deviceTimeZone();
  const today = todayIn(timeZone);
  const month = `${today.year}-${String(today.month).padStart(2, '0')}`;

  // The reports are the screen: if either fails it shows its error state. Merchants are a bonus.
  const [trend, comparison, spending] = await Promise.all([
    getMonthlyTrend(month, TREND_MONTHS, timeZone),
    getMonthlyComparison(month, timeZone),
    getSpendingRows(monthRange(today.year, today.month), timeZone).catch(() => null),
  ]);

  return buildInsights({ today, preferredCurrency: preferences?.currency ?? null, trend, comparison, spending });
}
