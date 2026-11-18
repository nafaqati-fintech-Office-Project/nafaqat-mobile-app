import type { DashboardData } from './types';
import { dayKey, monthsRange } from '@/features/transactions/transactionLinks';
import type { Language, TranslationKey } from '@/i18n';
import { intlLocale, monthName } from '@/utils/intl';

type T = (key: TranslationKey, params?: Record<string, string>) => string;

// The dashboard's period ("November 2026" or "Last 3 months") and its calendar days, for drill-down links.
export function dashboardPeriod(data: DashboardData, t: T, language: Language) {
  const { year, month } = data.period;
  const title =
    data.months === 1
      ? `${monthName(month, year, language)} ${year}`
      : t('dashboard.lastMonths').replace('{count}', String(data.months));
  return { title, ...monthsRange(year, month, data.months) };
}

// One month as a link title and range.
export function monthPeriod(year: number, month: number, language: Language) {
  return { title: `${monthName(month, year, language)} ${year}`, ...monthsRange(year, month, 1) };
}

// One calendar day as a link title and range.
export function dayPeriod(date: Date, language: Language) {
  const key = dayKey(date);
  const title = new Intl.DateTimeFormat(intlLocale(language), { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  return { title, from: key, to: key };
}

