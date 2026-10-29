import { beforeEach, describe, expect, it, vi } from 'vitest';

import { adjustUnreadCount, currentUnreadCount, refreshUnreadCount, setUnreadCount } from './unreadCount';

const getUnreadCount = vi.hoisted(() => vi.fn());
vi.mock('./notificationsService', () => ({ getUnreadCount }));
vi.mock('react-native', () => ({ AppState: { addEventListener: vi.fn() } }));

beforeEach(() => {
  getUnreadCount.mockReset();
  setUnreadCount(0);
});

describe('unread count', () => {
  it('takes the server count, and keeps the last one when the call fails', async () => {
    getUnreadCount.mockResolvedValueOnce(3).mockRejectedValueOnce(new Error('offline'));
    await refreshUnreadCount();
    expect(currentUnreadCount()).toBe(3);
    await expect(refreshUnreadCount()).resolves.toBeUndefined();
    expect(currentUnreadCount()).toBe(3);
  });

  it('moves by a change and never goes below zero', () => {
    setUnreadCount(2);
    adjustUnreadCount(-1);
    expect(currentUnreadCount()).toBe(1);
    adjustUnreadCount(-5);
    expect(currentUnreadCount()).toBe(0);
    adjustUnreadCount(2);
    expect(currentUnreadCount()).toBe(2);
  });
});
