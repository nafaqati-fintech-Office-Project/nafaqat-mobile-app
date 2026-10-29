import {
  NOTIFICATION_TYPES,
  type AppNotification,
  type NotificationPage,
  type NotificationPreference,
  type NotificationType,
  type Severity,
} from './types';
import { api } from '@/api/client';
import { arr, num, obj, str } from '@/api/parse';

const BASE = '/api/notifications';
const SEVERITIES: Severity[] = ['INFO', 'WARNING', 'CRITICAL'];

const optionalText = (value: unknown) => (typeof value === 'string' && value ? value : null);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isType = (value: unknown): value is NotificationType =>
  typeof value === 'string' && (NOTIFICATION_TYPES as readonly string[]).includes(value);

function parseDate(value: unknown): Date {
  const date = new Date(str(value));
  if (Number.isNaN(date.getTime())) throw new Error('Invalid date in response');
  return date;
}

export function parseNotification(raw: unknown): AppNotification {
  const body = obj(raw);
  const severity = SEVERITIES.find((s) => s === body.severity) ?? 'INFO';
  return {
    id: str(body.id),
    // A type added on the server later still shows; it just has no special handling.
    type: str(body.type),
    severity,
    title: str(body.title),
    message: optionalText(body.message) ?? '',
    referenceType: optionalText(body.referenceType),
    referenceId: optionalText(body.referenceId),
    categoryCode: optionalText(isRecord(body.params) ? body.params.categoryCode : null),
    read: body.read === true,
    createdAt: parseDate(body.createdAt),
  };
}

// Newest first; the service accepts 1 to 50 per page.
export async function fetchNotifications(page: number, size: number): Promise<NotificationPage> {
  const { data } = await api.get<unknown>(BASE, { params: { page, size } });
  const body = obj(data);
  return {
    items: arr(body.content).map(parseNotification),
    page: num(body.page),
    hasMore: body.last !== true,
  };
}

export async function fetchUnreadCount(): Promise<number> {
  const { data } = await api.get<unknown>(`${BASE}/unread-count`);
  return num(obj(data).count);
}

export async function markRead(id: string): Promise<void> {
  await api.patch(`${BASE}/${encodeURIComponent(id)}/read`);
}

export async function markAllRead(): Promise<void> {
  await api.patch(`${BASE}/read-all`);
}

export async function deleteNotification(id: string): Promise<void> {
  await api.delete(`${BASE}/${encodeURIComponent(id)}`);
}

// One entry per known type; types the app does not know yet are left out.
function parsePreferences(data: unknown): NotificationPreference[] {
  return arr(obj(data).preferences)
    .map(obj)
    .filter((p) => isType(p.type))
    .map((p) => ({ type: p.type as NotificationType, enabled: p.enabled === true }));
}

export async function fetchPreferences(): Promise<NotificationPreference[]> {
  const { data } = await api.get<unknown>(`${BASE}/preferences`);
  return parsePreferences(data);
}

export async function savePreference(preference: NotificationPreference): Promise<NotificationPreference[]> {
  const { data } = await api.put<unknown>(`${BASE}/preferences`, { preferences: [preference] });
  return parsePreferences(data);
}
