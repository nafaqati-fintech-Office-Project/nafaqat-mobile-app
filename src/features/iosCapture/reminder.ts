import AsyncStorage from '@react-native-async-storage/async-storage';

import { captureConfig } from './config';
import { loadStatuses, type AutomationFlow, type AutomationStatus } from './status';
import { notifyAlert } from '@/features/notifications/notify';
import { t } from '@/i18n';

// "No message for a while": an in-app banner and one push notification, never more than once a week for the same
// automation. Only automations that delivered at least once are watched, so someone who simply has no purchases to
// report is not nagged.

const WEEK_MS = 7 * 86_400_000;
const pushedKey = (flow: AutomationFlow) => `nafaqati.iosCapture.pushed.${flow}`;
const dismissedKey = (flow: AutomationFlow) => `nafaqati.iosCapture.dismissed.${flow}`;

async function lastTime(key: string): Promise<number> {
  try {
    return Number(await AsyncStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

const stale = (s: AutomationStatus): boolean => s.state === 'noRecent' && s.lastAt !== null;

/** The flows to show a banner for right now (not dismissed during the last week). */
export async function bannerFlows(now = Date.now()): Promise<AutomationFlow[]> {
  const out: AutomationFlow[] = [];
  for (const s of await loadStatuses(now)) {
    if (stale(s) && now - (await lastTime(dismissedKey(s.flow))) >= WEEK_MS) out.push(s.flow);
  }
  return out;
}

export async function dismissBanner(flow: AutomationFlow, now = Date.now()): Promise<void> {
  try {
    await AsyncStorage.setItem(dismissedKey(flow), String(now));
  } catch {
    // The banner simply shows again.
  }
}

/** Sends the weekly push for every stale automation. Safe to call as often as the app likes. */
export async function sendDueReminders(now = Date.now()): Promise<void> {
  const days = captureConfig().reminderDays;
  for (const s of await loadStatuses(now)) {
    if (!stale(s) || now - (await lastTime(pushedKey(s.flow))) < WEEK_MS) continue;
    try {
      await AsyncStorage.setItem(pushedKey(s.flow), String(now)); // first, so a failure cannot cause a repeat
    } catch {
      continue;
    }
    await notifyAlert({
      title: t('iosSetup.reminder.title'),
      body: t('iosSetup.reminder.body', { days: String(days) }),
      data: { referenceType: 'IOS_SETUP', referenceId: s.flow, categoryCode: null },
    });
  }
}
