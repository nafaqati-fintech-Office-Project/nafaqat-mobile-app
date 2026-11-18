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

// Set just before the app reloads to apply a new text direction, cleared once the direction is applied. If the reload
// comes back and the direction is still wrong (a development build or Expo Go can ignore it), this stops a reload loop.
const RELOAD_KEY = 'direction-reload';

export async function getDirectionReload(): Promise<'rtl' | 'ltr' | null> {
  try {
    const value = await AsyncStorage.getItem(RELOAD_KEY);
    return value === 'rtl' || value === 'ltr' ? value : null;
  } catch {
    return null;
  }
}

export async function setDirectionReload(direction: 'rtl' | 'ltr' | null): Promise<void> {
  try {
    if (direction) await AsyncStorage.setItem(RELOAD_KEY, direction);
    else await AsyncStorage.removeItem(RELOAD_KEY);
  } catch {
    // best effort
  }
}
