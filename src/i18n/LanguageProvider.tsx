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
import { DevSettings, I18nManager, Platform } from 'react-native';

import { setCurrentLanguage, t, type Language } from './index';
import { getDirectionReload, getStoredLanguage, setDirectionReload, storeLanguage } from '@/storage/language';

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

// Returns true when the native direction changed and a reload was triggered. A reload is tried once per direction: if the
// app comes back still in the wrong direction (a development build or Expo Go can ignore forceRTL), carry on instead of
// reloading forever.
async function applyDirection(rtl: boolean): Promise<boolean> {
  if (Platform.OS === 'web') {
    // No native layout direction and no reload on web: the page's dir attribute flips the layout.
    if (typeof document !== 'undefined') document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    return false;
  }
  I18nManager.allowRTL(true);
  if (I18nManager.isRTL === rtl) {
    await setDirectionReload(null);
    return false;
  }
  const wanted = rtl ? 'rtl' : 'ltr';
  if ((await getDirectionReload()) === wanted) return false;
  await setDirectionReload(wanted);
  I18nManager.forceRTL(rtl);
  reloadApp();
  return true;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<Language | null | undefined>(undefined);

  useEffect(() => {
    getStoredLanguage().then(async (value) => {
      setCurrentLanguage(value ?? 'en');
      if (!(await applyDirection(value === 'ar'))) setStored(value);
    });
  }, []);

  const setLanguage = useCallback(async (language: Language) => {
    await storeLanguage(language);
    setCurrentLanguage(language);
    if (!(await applyDirection(language === 'ar'))) setStored(language);
  }, []);

  const value = useMemo<LanguageContextValue>(() => {
    const language = stored ?? 'en';
    // A new function for each language. The React Compiler caches results keyed on what a component reads, and the shared
    // `t` never changes identity, so text could stay in the previous language after a switch that does not reload the app.
    const translate: typeof t = (key, params) => t(key, params);
    return { language, chosen: stored != null, isRTL: language === 'ar', setLanguage, t: translate };
  }, [stored, setLanguage]);

  if (stored === undefined) return null;

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
