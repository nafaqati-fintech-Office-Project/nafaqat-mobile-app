import { useCallback, useEffect, useRef, useState } from 'react';

import * as service from './notificationsService';
import type { AppNotification, NotificationPage } from './types';
import { adjustUnreadCount, refreshUnreadCount, setUnreadCount } from './unreadCount';

const PAGE_SIZE = 20;

type Status = 'loading' | 'ready' | 'error';

const unread = (items: AppNotification[]) => items.filter((n) => !n.read).length;

// The list with paging. Read and delete change the screen at once and are undone if the server refuses;
// each one returns false then, so the screen can say so.
export function useNotificationList() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const page = useRef(0);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const showFirstPage = useCallback((result: NotificationPage) => {
    page.current = 0;
    itemsRef.current = result.items;
    setItems(result.items);
    setHasMore(result.hasMore);
    setStatus('ready');
    void refreshUnreadCount();
  }, []);

  // First page again; a failure keeps what is on screen unless there was nothing to show.
  const reload = useCallback(async () => {
    try {
      showFirstPage(await service.getNotifications(0, PAGE_SIZE));
    } catch {
      setStatus((current) => (current === 'ready' ? current : 'error'));
    }
  }, [showFirstPage]);

  useEffect(() => {
    let active = true;
    service
      .getNotifications(0, PAGE_SIZE)
      .then((result) => active && showFirstPage(result))
      .catch(() => active && setStatus('error'));
    return () => {
      active = false;
    };
  }, [showFirstPage]);

  const refresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const retry = async () => {
    setStatus('loading');
    await reload();
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore || status !== 'ready') return;
    setLoadingMore(true);
    try {
      const result = await service.getNotifications(page.current + 1, PAGE_SIZE);
      page.current = result.page;
      // A notification created meanwhile shifts the pages; never show one twice.
      setItems((current) => [...current, ...result.items.filter((n) => !current.some((c) => c.id === n.id))]);
      setHasMore(result.hasMore);
    } catch {
      // the next scroll tries again
    } finally {
      setLoadingMore(false);
    }
  };

  // Applies a change on screen, runs the request, and puts the list back if it fails.
  const optimistic = async (change: (list: AppNotification[]) => AppNotification[], request: () => Promise<void>) => {
    const before = itemsRef.current;
    const after = change(before);
    itemsRef.current = after;
    setItems(after);
    // The badge also counts unread notifications on pages not loaded yet, so it moves by the change here.
    adjustUnreadCount(unread(after) - unread(before));
    try {
      await request();
      return true;
    } catch {
      itemsRef.current = before;
      setItems(before);
      return false;
    } finally {
      void refreshUnreadCount();
    }
  };

  const markRead = (id: string) =>
    optimistic(
      (list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)),
      () => service.markRead(id),
    );

  const markAllRead = () => {
    setUnreadCount(0);
    return optimistic(
      (list) => list.map((n) => ({ ...n, read: true })),
      () => service.markAllRead(),
    );
  };

  const remove = (id: string) =>
    optimistic(
      (list) => list.filter((n) => n.id !== id),
      () => service.deleteNotification(id),
    );

  return { items, status, refreshing, loadingMore, hasMore, refresh, retry, reload, loadMore, markRead, markAllRead, remove };
}
