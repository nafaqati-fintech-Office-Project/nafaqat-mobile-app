import AsyncStorage from '@react-native-async-storage/async-storage';

import type { FlowId } from './types';

// Small local memory of the setup. Nothing here contains message text.

const KEYS = {
  consent: 'nafaqati.iosSetup.consentAt',
  done: 'nafaqati.iosSetup.done',
  events: 'nafaqati.iosSetup.events',
} as const;

export async function getConsent(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEYS.consent)) !== null;
  } catch {
    return false;
  }
}

export async function setConsent(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.consent, new Date().toISOString());
  } catch {
    // The user is simply asked again next time.
  }
}

export async function getSetupDone(): Promise<Partial<Record<FlowId, boolean>>> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.done);
    return raw ? (JSON.parse(raw) as Partial<Record<FlowId, boolean>>) : {};
  } catch {
    return {};
  }
}

export async function markSetupDone(flow: FlowId): Promise<void> {
  try {
    const done = await getSetupDone();
    await AsyncStorage.setItem(KEYS.done, JSON.stringify({ ...done, [flow]: true }));
  } catch {
    // Non-fatal: the status line just stays on "not set up".
  }
}

export type SetupEventRecord = { event: string; at: string; flow?: FlowId; step?: string; number?: number };

const MAX_EVENTS = 200;
let writing: Promise<void> = Promise.resolve();

/** Appends to the local event buffer (oldest dropped past 200). Writes are queued so none are lost. */
export function appendEvent(record: SetupEventRecord): Promise<void> {
  writing = writing.then(async () => {
    try {
      const raw = await AsyncStorage.getItem(KEYS.events);
      const list = raw ? (JSON.parse(raw) as SetupEventRecord[]) : [];
      list.push(record);
      await AsyncStorage.setItem(KEYS.events, JSON.stringify(list.slice(-MAX_EVENTS)));
    } catch {
      // Tracking must never break the setup.
    }
  });
  return writing;
}

export async function readEvents(): Promise<SetupEventRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.events);
    return raw ? (JSON.parse(raw) as SetupEventRecord[]) : [];
  } catch {
    return [];
  }
}
