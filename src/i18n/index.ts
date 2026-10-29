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

// params fill {name} placeholders in the text; a placeholder without a value is left as written.
export const t = (key: TranslationKey, params?: Record<string, string>): string => {
  const text = dictionaries[current][key];
  return params ? text.replace(/\{(\w+)\}/g, (match, name: string) => params[name] ?? match) : text;
};
