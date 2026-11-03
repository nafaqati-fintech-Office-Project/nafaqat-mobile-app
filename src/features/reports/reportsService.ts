import { buildReport, TREND_MONTHS } from './reportBuilder';
import { mockReport } from './mock';
import type { Report } from './types';
import { AUTH_BYPASS } from '@/config/flags';
import { getPreferences } from '@/features/dashboard/dashboardApi';
import { deviceTimeZone, monthRange, todayIn } from '@/features/dashboard/dashboardBuilder';
import { getMonthlyComparison, getMonthlyTrend, getSpendingRows } from '@/features/insights/insightsApi';

const MOCK_DELAY_MS = 400;

export type Period = { year: number; month: number };

const daysIn = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

// Today's month in the user's zone, which is where the report starts.
export async function currentPeriod(): Promise<Period> {
  if (AUTH_BYPASS) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  const preferences = await getPreferences().catch(() => null);
  const today = todayIn(preferences?.timezone ?? deviceTimeZone());
  return { year: today.year, month: today.month };
}

export async function getReport(period: Period): Promise<Report> {
  // The bypass session has no token, so the real endpoints would answer 401.
  if (AUTH_BYPASS) {
    await new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
    return mockReport(period);
  }

  // Preferences only refine currency and time zone, so a failure here never blocks the report.
  const preferences = await getPreferences().catch(() => null);
  const timeZone = preferences?.timezone ?? deviceTimeZone();
  const today = todayIn(timeZone);
  const month = `${period.year}-${String(period.month).padStart(2, '0')}`;
  const isCurrent = period.year === today.year && period.month === today.month;

  // The comparison is the report: if it fails the screen shows its error state. The rest is a bonus.
  const [comparison, trend, spending] = await Promise.all([
    getMonthlyComparison(month, timeZone),
    getMonthlyTrend(month, TREND_MONTHS, timeZone).catch(() => null),
    getSpendingRows(monthRange(period.year, period.month), timeZone).catch(() => null),
  ]);

  return buildReport({
    period,
    preferredCurrency: preferences?.currency ?? null,
    comparison,
    trend,
    spending,
    daysCounted: isCurrent ? today.day : daysIn(period.year, period.month),
  });
}
