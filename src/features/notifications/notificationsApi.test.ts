import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  deleteNotification,
  fetchNotifications,
  fetchPreferences,
  fetchUnreadCount,
  markAllRead,
  markRead,
  parseNotification,
  savePreference,
} from './notificationsApi';
import { notificationLink } from './notificationLink';

const http = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock('@/api/client', () => ({ api: http }));

const raw = {
  id: '6f1c',
  type: 'BUDGET_THRESHOLD',
  severity: 'WARNING',
  title: 'Groceries budget at 80%',
  message: 'You have spent 800 of 1000.',
  templateKey: 'BUDGET_THRESHOLD',
  params: { periodEnd: '2026-10-31' },
  referenceType: 'BUDGET',
  referenceId: 'b-1',
  read: false,
  readAt: null,
  createdAt: '2026-10-29T08:15:00Z',
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('parseNotification', () => {
  it('reads the fields the app shows', () => {
    expect(parseNotification(raw)).toEqual({
      id: '6f1c',
      type: 'BUDGET_THRESHOLD',
      severity: 'WARNING',
      title: 'Groceries budget at 80%',
      message: 'You have spent 800 of 1000.',
      referenceType: 'BUDGET',
      referenceId: 'b-1',
      categoryCode: null,
      read: false,
      createdAt: new Date('2026-10-29T08:15:00Z'),
    });
  });

  it('keeps the category of a category budget alert', () => {
    expect(parseNotification({ ...raw, params: { categoryCode: 'GROCERIES', percentage: 80 } }).categoryCode).toBe(
      'GROCERIES',
    );
    expect(parseNotification({ ...raw, params: null }).categoryCode).toBeNull();
  });

  it('accepts a missing message, no reference and an unknown severity', () => {
    const parsed = parseNotification({ ...raw, message: null, referenceType: null, referenceId: null, severity: 'NEW' });
    expect(parsed).toMatchObject({ message: '', referenceType: null, referenceId: null, severity: 'INFO' });
  });

  it('refuses a notification without an id or a valid date', () => {
    expect(() => parseNotification({ ...raw, id: undefined })).toThrow();
    expect(() => parseNotification({ ...raw, createdAt: 'yesterday' })).toThrow();
  });
});

describe('notification service calls', () => {
  it('pages through the list, newest first from the server', async () => {
    http.get.mockResolvedValue({ data: { content: [raw], page: 1, size: 20, totalElements: 21, totalPages: 2, last: true } });
    expect(await fetchNotifications(1, 20)).toMatchObject({ page: 1, hasMore: false, items: [{ id: '6f1c' }] });
    expect(http.get).toHaveBeenCalledWith('/api/notifications', { params: { page: 1, size: 20 } });
  });

  it('reads the unread count', async () => {
    http.get.mockResolvedValue({ data: { count: 4 } });
    expect(await fetchUnreadCount()).toBe(4);
    expect(http.get).toHaveBeenCalledWith('/api/notifications/unread-count');
  });

  it('marks read, marks all read and deletes', async () => {
    http.patch.mockResolvedValue({ data: {} });
    http.delete.mockResolvedValue({ data: null });
    await markRead('a/b');
    await markAllRead();
    await deleteNotification('6f1c');
    expect(http.patch.mock.calls).toEqual([['/api/notifications/a%2Fb/read'], ['/api/notifications/read-all']]);
    expect(http.delete).toHaveBeenCalledWith('/api/notifications/6f1c');
  });

  it('reads the switches and leaves out types the app does not know', async () => {
    http.get.mockResolvedValue({
      data: {
        preferences: [
          { type: 'BUDGET_EXCEEDED', enabled: false },
          { type: 'SYSTEM', enabled: true },
          { type: 'SOMETHING_NEW', enabled: true },
        ],
      },
    });
    expect(await fetchPreferences()).toEqual([
      { type: 'BUDGET_EXCEEDED', enabled: false },
      { type: 'SYSTEM', enabled: true },
    ]);
  });

  it('saves one switch at a time', async () => {
    http.put.mockResolvedValue({ data: { preferences: [{ type: 'FAMILY', enabled: false }] } });
    expect(await savePreference({ type: 'FAMILY', enabled: false })).toEqual([{ type: 'FAMILY', enabled: false }]);
    expect(http.put).toHaveBeenCalledWith('/api/notifications/preferences', {
      preferences: [{ type: 'FAMILY', enabled: false }],
    });
  });
});

describe('notificationLink', () => {
  const ref = (referenceType: string | null, referenceId: string | null = null, categoryCode: string | null = null) => ({
    referenceType,
    referenceId,
    categoryCode,
  });

  it('opens the transaction it is about, highlighted', () => {
    expect(notificationLink(ref('TRANSACTION', 'tx-9'), 42)).toEqual({
      pathname: '/transactions',
      params: { highlight: 'tx-9', at: '42' },
    });
    expect(notificationLink(ref('TRANSACTION'))).toBe('/transactions');
  });

  it('opens the budget at the category, or the month for an overall alert', () => {
    expect(notificationLink(ref('BUDGET', 'b-1', 'GROCERIES'), 7)).toEqual({
      pathname: '/budget',
      params: { highlight: 'GROCERIES', at: '7' },
    });
    expect(notificationLink(ref('BUDGET', 'b-1'), 7)).toEqual({ pathname: '/budget', params: { highlight: 'overall', at: '7' } });
  });

  it('opens the subscriptions, and the goal itself when the alert names it', () => {
    expect(notificationLink(ref('SUBSCRIPTION', 's-1'))).toBe('/subscriptions');
    expect(notificationLink(ref('GOAL', 'g-1'))).toEqual({ pathname: '/goal', params: { id: 'g-1' } });
    expect(notificationLink(ref('GOAL'))).toBe('/goals');
  });

  it('opens nothing for the rest, and each tap is a new highlight', () => {
    expect(notificationLink(ref(null))).toBeNull();
    expect(notificationLink(ref('TRANSACTION', 'x'), 1)).not.toEqual(notificationLink(ref('TRANSACTION', 'x'), 2));
  });
});
