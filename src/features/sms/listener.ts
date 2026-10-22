import AsyncStorage from '@react-native-async-storage/async-storage';

import { readInbox, type SmsMessage } from './smsReader';

const POLL_MS = 15_000;
const SCAN_LIMIT = 50;
const CURSOR_KEY = 'smsLastSeenDate';

type OnSms = (sms: SmsMessage) => void;

const seen = new Set<string>();
let timer: ReturnType<typeof setInterval> | null = null;
let onSms: OnSms | null = null;
let lastSeenDate: number | null = null;
let scanning = false;

async function loadCursor(): Promise<number> {
  if (lastSeenDate !== null) return lastSeenDate;
  const stored = Number(await AsyncStorage.getItem(CURSOR_KEY));
  lastSeenDate = stored > 0 ? stored : Date.now();
  if (!(stored > 0)) await AsyncStorage.setItem(CURSOR_KEY, String(lastSeenDate));
  return lastSeenDate;
}

export async function scanInbox(): Promise<void> {
  const callback = onSms;
  if (!callback || scanning) return;
  scanning = true;
  try {
    const cursor = await loadCursor();
    const messages = await readInbox({ limit: SCAN_LIMIT, minDate: cursor + 1 });
    const fresh = messages.filter((sms) => !seen.has(sms.id)).sort((a, b) => a.date - b.date);
    for (const sms of fresh) {
      seen.add(sms.id);
      lastSeenDate = Math.max(lastSeenDate ?? 0, sms.date);
      callback(sms);
    }
    if (fresh.length > 0) await AsyncStorage.setItem(CURSOR_KEY, String(lastSeenDate));
  } catch {
    // The next poll retries.
  } finally {
    scanning = false;
  }
}

export function startSmsListener(callback: OnSms): void {
  stopSmsListener();
  onSms = callback;
  void scanInbox();
  timer = setInterval(() => void scanInbox(), POLL_MS);
}

export function stopSmsListener(): void {
  if (timer) clearInterval(timer);
  timer = null;
  onSms = null;
}
