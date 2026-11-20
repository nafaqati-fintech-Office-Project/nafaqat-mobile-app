import AsyncStorage from '@react-native-async-storage/async-storage';

import type { DashboardData } from '@/features/dashboard/types';

// The last dashboard and the account's preferences, kept on the phone so the home screen can show something at
// once and refresh in the background. The server stays the source of truth: every open still asks it, and its
// answer replaces what was cached. Kept per account, and cleared on sign out.
const VERSION = 'v1';
const dashboardKey = (userId: string, months: number) => `dashboard-cache:${VERSION}:${userId}:${months}`;
const preferencesKey = (userId: string) => `dashboard-prefs:${VERSION}:${userId}`;

export type CachedPreferences = { currency: string; timezone: string };

// Dates do not survive JSON, so the recent transactions' dates are turned back into Date objects.
function revive(raw: unknown): DashboardData | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as DashboardData;
  if (!Array.isArray(data.recent) || !Array.isArray(data.categories) || !data.period) return null;
  return { ...data, recent: data.recent.map((item) => ({ ...item, date: new Date(item.date) })) };
}

export async function readCachedDashboard(userId: string | null, months: number): Promise<DashboardData | null> {
  if (!userId) return null;
  try {
    const text = await AsyncStorage.getItem(dashboardKey(userId, months));
    return text ? revive(JSON.parse(text)) : null;
  } catch {
    return null;
  }
}

export async function writeCachedDashboard(userId: string | null, months: number, data: DashboardData): Promise<void> {
  if (!userId) return;
  try {
    await AsyncStorage.setItem(dashboardKey(userId, months), JSON.stringify(data));
  } catch {
    // best effort: the cache only makes the screen faster
  }
}

export async function readCachedPreferences(userId: string | null): Promise<CachedPreferences | null> {
  if (!userId) return null;
  try {
    const text = await AsyncStorage.getItem(preferencesKey(userId));
    const value = text ? (JSON.parse(text) as Partial<CachedPreferences>) : null;
    return value && typeof value.currency === 'string' && typeof value.timezone === 'string'
      ? { currency: value.currency, timezone: value.timezone }
      : null;
  } catch {
    return null;
  }
}

export async function writeCachedPreferences(userId: string | null, preferences: CachedPreferences): Promise<void> {
  if (!userId) return;
  try {
    await AsyncStorage.setItem(preferencesKey(userId), JSON.stringify(preferences));
  } catch {
    // best effort
  }
}

export async function clearDashboardCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((key) => key.startsWith('dashboard-cache:') || key.startsWith('dashboard-prefs:'));
    if (ours.length) await AsyncStorage.multiRemove(ours);
  } catch {
    // best effort
  }
}
