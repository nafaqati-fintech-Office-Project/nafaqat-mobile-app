import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Language } from '@/i18n';

const KEY = 'language';

export async function getStoredLanguage(): Promise<Language | null> {
  try {
    const value = await AsyncStorage.getItem(KEY);
    return value === 'en' || value === 'ar' ? value : null;
  } catch {
    return null;
  }
}

export async function storeLanguage(language: Language): Promise<void> {
  await AsyncStorage.setItem(KEY, language);
}
