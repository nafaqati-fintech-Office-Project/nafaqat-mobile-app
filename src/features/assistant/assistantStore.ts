import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ChatMessage } from './types';

// The conversation stays on this device, per account; only the last few messages go to the server.
const MAX_SAVED = 60;
const historyKey = (userId: string) => `nafaqati.assistant.history.${userId}`;
const consentKey = (userId: string) => `nafaqati.assistant.consent.${userId}`;

export async function loadHistory(userId: string): Promise<ChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(historyKey(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((m): m is ChatMessage => !!m && typeof m.text === 'string' && (m.role === 'user' || m.role === 'assistant'))
      : [];
  } catch {
    return [];
  }
}

export async function saveHistory(userId: string, messages: ChatMessage[]): Promise<void> {
  try {
    await AsyncStorage.setItem(historyKey(userId), JSON.stringify(messages.slice(-MAX_SAVED)));
  } catch {
    // Non-fatal: the chat simply starts empty next time.
  }
}

export async function clearHistory(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(historyKey(userId));
  } catch {
    // Nothing to do.
  }
}

// The one-time notice that a summary of the user's spending is processed to answer (PDPL).
export async function getConsent(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(consentKey(userId))) === 'true';
  } catch {
    return false;
  }
}

export async function setConsent(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(consentKey(userId), 'true');
  } catch {
    // The notice shows again next time.
  }
}
