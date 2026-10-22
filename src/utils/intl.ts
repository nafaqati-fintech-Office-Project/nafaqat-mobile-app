import type { Language } from '@/i18n';

// Gregorian calendar and Western digits in both languages.
const LOCALES: Record<Language, string> = { en: 'en-US', ar: 'ar-u-ca-gregory-nu-latn' };

export const intlLocale = (language: Language) => LOCALES[language];

export const monthName = (month: number, year: number, language: Language) =>
  new Intl.DateTimeFormat(intlLocale(language), { month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );

// day 0 = Monday ... 6 = Sunday (2024-01-01 was a Monday).
export const weekdayShort = (day: number, language: Language) =>
  new Intl.DateTimeFormat(intlLocale(language), { weekday: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2024, 0, 1 + day)),
  );
