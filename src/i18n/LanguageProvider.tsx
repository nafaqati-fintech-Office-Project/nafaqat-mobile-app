import * as Updates from 'expo-updates';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DevSettings, I18nManager } from 'react-native';

import { setCurrentLanguage, t, type Language } from './index';
import { getStoredLanguage, storeLanguage } from '@/storage/language';

type LanguageContextValue = {
  language: Language;
  chosen: boolean;
  isRTL: boolean;
  setLanguage: (language: Language) => Promise<void>;
  t: typeof t;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function reloadApp() {
  if (__DEV__) DevSettings.reload();
  else void Updates.reloadAsync();
}

// Returns true when the native direction changed and a reload was triggered.
function applyDirection(rtl: boolean): boolean {
  I18nManager.allowRTL(true);
  if (I18nManager.isRTL === rtl) return false;
  I18nManager.forceRTL(rtl);
  reloadApp();
  return true;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<Language | null | undefined>(undefined);

  useEffect(() => {
    getStoredLanguage().then((value) => {
      setCurrentLanguage(value ?? 'en');
      if (!applyDirection(value === 'ar')) setStored(value);
    });
  }, []);

  const setLanguage = useCallback(async (language: Language) => {
    await storeLanguage(language);
    setCurrentLanguage(language);
    if (!applyDirection(language === 'ar')) setStored(language);
  }, []);

  const value = useMemo<LanguageContextValue>(() => {
    const language = stored ?? 'en';
    return { language, chosen: stored != null, isRTL: language === 'ar', setLanguage, t };
  }, [stored, setLanguage]);

  if (stored === undefined) return null;

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
