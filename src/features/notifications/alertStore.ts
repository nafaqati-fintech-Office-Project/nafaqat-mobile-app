import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AnnouncedLevels } from './budgetAlerts';

const IDS_KEY = 'nafaqati.alerts.announcedIds';
const LEVELS_KEY = 'nafaqati.alerts.levels';
const MAX_IDS = 200;
const MAX_LEVELS = 100;

async function read<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function write(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The worst case is one banner shown again.
  }
}

// null = never run before (the first run records without a banner).
export async function loadAnnouncedIds(): Promise<Set<string> | null> {
  const ids = await read<string[]>(IDS_KEY);
  return ids ? new Set(ids) : null;
}

export async function saveAnnouncedIds(known: ReadonlySet<string> | null, added: string[]): Promise<void> {
  await write(IDS_KEY, [...(known ?? []), ...added].slice(-MAX_IDS));
}

export async function loadLevels(): Promise<AnnouncedLevels> {
  return (await read<AnnouncedLevels>(LEVELS_KEY)) ?? {};
}

export async function saveLevels(levels: AnnouncedLevels): Promise<void> {
  await write(LEVELS_KEY, Object.fromEntries(Object.entries(levels).slice(-MAX_LEVELS)));
}
