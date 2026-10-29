import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { getUnreadCount } from './notificationsService';

// The service has no push channel, so the count is polled, as in the web app.
export const POLL_MS = 45_000;

let count = 0;
const listeners = new Set<() => void>();

export function setUnreadCount(value: number): void {
  const next = Math.max(0, value);
  if (next === count) return;
  count = next;
  listeners.forEach((listener) => listener());
}

export const currentUnreadCount = (): number => count;

export const adjustUnreadCount = (delta: number): void => setUnreadCount(count + delta);

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

// The bell's number, shared by every screen.
export function useUnreadCount(): number {
  return useSyncExternalStore(subscribe, currentUnreadCount);
}

// Asks the server for the exact count. A failure keeps the last one. Never throws.
export async function refreshUnreadCount(): Promise<void> {
  try {
    setUnreadCount(await getUnreadCount());
  } catch {
    // shown again on the next poll
  }
}

// While signed in: now, every POLL_MS while the app is in the foreground, and when it comes back to it.
export function useUnreadCountPolling(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      void refreshUnreadCount();
      timer ??= setInterval(() => void refreshUnreadCount(), POLL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    start();
    const sub = AppState.addEventListener('change', (state) => (state === 'active' ? start() : stop()));
    return () => {
      stop();
      sub.remove();
      setUnreadCount(0);
    };
  }, [enabled]);
}
