import { ar } from './ar';
import { en, type TranslationKey } from './en';

export type Language = 'en' | 'ar';
export type { TranslationKey };

const dictionaries: Record<Language, Record<TranslationKey, string>> = { en, ar };

let current: Language = 'en';

export const getLanguage = () => current;
export const setCurrentLanguage = (language: Language) => {
  current = language;
};

export const t = (key: TranslationKey): string => dictionaries[current][key];
