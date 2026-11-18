import AsyncStorage from '@react-native-async-storage/async-storage';

import { IOS_TEST_SMS_ENABLED } from '@/config/flags';
import { api } from '@/api/client';

// Asks the backend to text a test message (it contains the keyword and the NFQ-TEST marker) to the user's verified
// mobile number. The backend side is a separate work item, so this stays off (and the app shows "Setup saved. It will
// connect on your next bank message") until EXPO_PUBLIC_IOS_TEST_SMS=true. The backend enforces the limit too.

export type TestSmsResult = 'sent' | 'unavailable' | 'limit';

const DAILY_LIMIT = 3;
const KEY = 'nafaqati.iosCapture.testSms';

type Counter = { day: string; count: number };

const today = (now: number) => new Date(now).toISOString().slice(0, 10);

async function readCounter(now: number): Promise<Counter> {
  try {
    const raw = JSON.parse((await AsyncStorage.getItem(KEY)) ?? 'null') as Counter | null;
    return raw && raw.day === today(now) ? raw : { day: today(now), count: 0 };
  } catch {
    return { day: today(now), count: 0 };
  }
}

export async function requestTestSms(now = Date.now()): Promise<TestSmsResult> {
  if (!IOS_TEST_SMS_ENABLED) return 'unavailable';
  const counter = await readCounter(now);
  if (counter.count >= DAILY_LIMIT) return 'limit';
  try {
    await api.post('/api/capture/test-sms');
  } catch {
    return 'unavailable';
  }
  await AsyncStorage.setItem(KEY, JSON.stringify({ day: counter.day, count: counter.count + 1 })).catch(() => undefined);
  return 'sent';
}
