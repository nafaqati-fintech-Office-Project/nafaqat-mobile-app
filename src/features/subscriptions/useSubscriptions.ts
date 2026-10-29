import { useCallback, useEffect, useState } from 'react';

import { act, getSubscriptions } from './subscriptionsService';
import type { SubscriptionsData } from './types';
import { getPreferences } from '@/features/dashboard/dashboardApi';

type Status = 'loading' | 'ready' | 'error';
type Loaded = { data: SubscriptionsData; preferred: string | null };

// Preferences only choose the currency shown, so a failure there never blocks the screen.
const load = async (): Promise<Loaded> => {
  const [data, preferences] = await Promise.all([getSubscriptions(), getPreferences().catch(() => null)]);
  return { data, preferred: preferences?.currency ?? null };
};

export function useSubscriptions() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const show = useCallback((next: Loaded) => {
    setLoaded(next);
    setStatus('ready');
  }, []);

  useEffect(() => {
    let active = true;
    load()
      .then((next) => active && show(next))
      .catch(() => active && setStatus('error'));
    return () => {
      active = false;
    };
  }, [show]);

  // Keeps what is on screen when a reload fails, unless there was nothing to show.
  const reload = useCallback(async () => {
    try {
      show(await load());
    } catch {
      setStatus((current) => (current === 'ready' ? current : 'error'));
    }
  }, [show]);

  const refresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const retry = async () => {
    setStatus('loading');
    await reload();
  };

  // Runs an action, then reloads so the totals and the 30-day list agree with the service. A refusal
  // usually means the subscription changed elsewhere, so it reloads then too, and throws for the screen
  // to explain.
  const run = async (id: string, action: 'confirm' | 'dismiss' | 'end') => {
    setBusyId(id);
    try {
      await act(id, action).catch(async (error: unknown) => {
        await reload();
        throw error;
      });
      await reload();
    } finally {
      setBusyId(null);
    }
  };

  return { loaded, status, refreshing, busyId, refresh, retry, reload, run };
}
