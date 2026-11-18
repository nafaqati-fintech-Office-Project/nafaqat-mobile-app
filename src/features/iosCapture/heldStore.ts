import AsyncStorage from '@react-native-async-storage/async-storage';

import { fingerprint } from './filters';

// Small local memory for the capture pipeline. It holds no message text: Wallet fields (merchant, amount, last four
// digits) and content fingerprints only.

export type HeldPayment = {
  id: string;
  receivedAt: number;
  merchant: string | null;
  amount: number;
  currency: string;
  cardLast4: string | null;
  /** Set once the wait for the SMS ran out on an incomplete item: the user must complete it. */
  needsCompletion?: boolean;
};

const HELD_KEY = 'nafaqati.iosCapture.held';
const SEEN_KEY = 'nafaqati.iosCapture.seen';
const SEEN_LIMIT = 100;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export const readHeld = (): Promise<HeldPayment[]> => readJson<HeldPayment[]>(HELD_KEY, []);
export const writeHeld = (list: HeldPayment[]): Promise<void> => AsyncStorage.setItem(HELD_KEY, JSON.stringify(list));

type Seen = { hash: string; at: number };

async function readSeen(now: number, windowMs: number): Promise<Seen[]> {
  return (await readJson<Seen[]>(SEEN_KEY, [])).filter((s) => now - s.at <= windowMs);
}

/** True when the same message text was already handled within the window (the second automation's copy). */
export async function wasSeenRecently(text: string, now: number, windowMs: number): Promise<boolean> {
  const hash = fingerprint(text);
  return (await readSeen(now, windowMs)).some((s) => s.hash === hash);
}

/** Called only after the message was handled, so a failed attempt is not mistaken for a duplicate on the retry. */
export async function markSeen(text: string, now: number, windowMs: number): Promise<void> {
  const list = await readSeen(now, windowMs);
  list.push({ hash: fingerprint(text), at: now });
  try {
    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(list.slice(-SEEN_LIMIT)));
  } catch {
    // A missed write only means a duplicate could slip through once.
  }
}
