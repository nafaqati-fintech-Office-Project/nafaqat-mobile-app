import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { captureConfig } from './config';
import { readHeld } from './heldStore';
import { captureStatus } from '../../../modules/nafaqati-capture';
import { getSetupDone } from '@/features/iosSetup/storage';

// The state of each automation, shown in Settings and used for the reminders. Pure timestamps: no message content.

export type AutomationFlow = 'bank' | 'wallet';
export type AutomationState = 'connected' | 'notSetUp' | 'noRecent';
export type AutomationStatus = { flow: AutomationFlow; state: AutomationState; lastAt: number | null };

const DAY_MS = 86_400_000;

export function stateOf(setUp: boolean, lastAt: number, now: number, reminderDays: number): AutomationState {
  if (!setUp && lastAt <= 0) return 'notSetUp';
  if (lastAt > 0 && now - lastAt <= reminderDays * DAY_MS) return 'connected';
  return 'noRecent';
}

export async function loadStatuses(now = Date.now()): Promise<AutomationStatus[]> {
  const [native, done] = await Promise.all([captureStatus(), getSetupDone()]);
  const days = captureConfig().reminderDays;
  const make = (flow: AutomationFlow, setUp: boolean, lastAt: number): AutomationStatus => ({
    flow,
    state: stateOf(setUp, lastAt, now, days),
    lastAt: lastAt > 0 ? lastAt : null,
  });
  return [
    make('bank', Boolean(done.bank || done['bank-extra']), native.lastBankAt),
    make('wallet', Boolean(done.wallet), native.lastWalletAt),
  ];
}

/** How many held Apple Pay payments are still waiting for the user to fill in what Wallet left empty. */
export async function countNeedingCompletion(): Promise<number> {
  return (await readHeld()).filter((h) => h.needsCompletion).length;
}

// After an iOS update the Shortcuts screens may have changed, so the user is asked to run the connection test again.
// The request stays until the setup is confirmed again.
const IOS_KEY = 'nafaqati.iosCapture.iosMajor';
const RETEST_KEY = 'nafaqati.iosCapture.retest';

/** Notices a new major iOS version (call once per app start). */
export async function detectIosUpdate(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  const major = Number.parseInt(String(Platform.Version), 10) || 0;
  try {
    const previous = Number(await AsyncStorage.getItem(IOS_KEY));
    await AsyncStorage.setItem(IOS_KEY, String(major));
    if (previous > 0 && major > previous) await AsyncStorage.setItem(RETEST_KEY, '1');
  } catch {
    // Not asking again is the safe failure.
  }
}

export const needsRetest = async (): Promise<boolean> => (await AsyncStorage.getItem(RETEST_KEY).catch(() => null)) === '1';

export const clearRetest = async (): Promise<void> => {
  await AsyncStorage.removeItem(RETEST_KEY).catch(() => undefined);
};
