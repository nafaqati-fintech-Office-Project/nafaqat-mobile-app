import * as remote from './notificationsApi';
import { mockNotifications, mockPreferences } from './mock';
import type { NotificationPage, NotificationPreference } from './types';
import { AUTH_BYPASS } from '@/config/flags';

// The bypass session has no token, so the real endpoints would answer 401; it uses the sample data.

const MOCK_DELAY_MS = 300;
const wait = () => new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

let mockItems = [...mockNotifications];
let mockPrefs = [...mockPreferences];

export async function getNotifications(page: number, size: number): Promise<NotificationPage> {
  if (!AUTH_BYPASS) return remote.fetchNotifications(page, size);
  await wait();
  return { items: mockItems.slice(page * size, (page + 1) * size), page, hasMore: (page + 1) * size < mockItems.length };
}

export async function getUnreadCount(): Promise<number> {
  if (!AUTH_BYPASS) return remote.fetchUnreadCount();
  return mockItems.filter((n) => !n.read).length;
}

export async function markRead(id: string): Promise<void> {
  if (!AUTH_BYPASS) return remote.markRead(id);
  mockItems = mockItems.map((n) => (n.id === id ? { ...n, read: true } : n));
}

export async function markAllRead(): Promise<void> {
  if (!AUTH_BYPASS) return remote.markAllRead();
  mockItems = mockItems.map((n) => ({ ...n, read: true }));
}

export async function deleteNotification(id: string): Promise<void> {
  if (!AUTH_BYPASS) return remote.deleteNotification(id);
  mockItems = mockItems.filter((n) => n.id !== id);
}

export async function getPreferences(): Promise<NotificationPreference[]> {
  if (!AUTH_BYPASS) return remote.fetchPreferences();
  await wait();
  return mockPrefs;
}

export async function savePreference(preference: NotificationPreference): Promise<NotificationPreference[]> {
  if (!AUTH_BYPASS) return remote.savePreference(preference);
  mockPrefs = mockPrefs.map((p) => (p.type === preference.type ? preference : p));
  return mockPrefs;
}
