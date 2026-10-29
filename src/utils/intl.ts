import type { Language } from '@/i18n';

// Gregorian calendar and Western digits in both languages.
const LOCALES: Record<Language, string> = { en: 'en-US', ar: 'ar-u-ca-gregory-nu-latn' };

export const intlLocale = (language: Language) => LOCALES[language];

export const monthName = (month: number, year: number, language: Language) =>
  new Intl.DateTimeFormat(intlLocale(language), { month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );

// Whole calendar days between the date and now, in the phone's zone (0 = today).
export function daysAgo(date: Date, now = new Date()): number {
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((start(now) - start(date)) / 86_400_000);
}

// "Today, 10:24", "Yesterday, 18:41" or "26 Oct, 07:45": for a row that is not under a day heading.
export function dayTimeLabel(
  date: Date,
  language: Language,
  labels: { today: string; yesterday: string },
  now = new Date(),
): string {
  const locale = intlLocale(language);
  const clock = new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(date);
  const ago = daysAgo(date, now);
  const day =
    ago === 0
      ? labels.today
      : ago === 1
        ? labels.yesterday
        : new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(date);
  return `${day}, ${clock}`;
}

// day 0 = Monday ... 6 = Sunday (2024-01-01 was a Monday).
export const weekdayShort = (day: number, language: Language) =>
  new Intl.DateTimeFormat(intlLocale(language), { weekday: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2024, 0, 1 + day)),
  );
