import { intlLocale } from '@/utils/intl';
import type { Language } from '@/i18n';

// Typed to confirm, in every language: one fixed word is easier to explain than a translated one.
export const CONFIRM_WORD = 'DELETE';

export const isConfirmed = (typed: string) => typed.trim().toUpperCase() === CONFIRM_WORD;

// "12 December 2026" in the app language.
export function deletionDate(purgeAfter: string, language: Language): string {
  const date = new Date(purgeAfter);
  if (Number.isNaN(date.getTime())) return purgeAfter;
  return new Intl.DateTimeFormat(intlLocale(language), { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}
