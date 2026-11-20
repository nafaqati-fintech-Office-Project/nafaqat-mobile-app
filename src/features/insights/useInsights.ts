import { useCallback, useEffect, useState } from 'react';

import { describeFailure } from './describeFailure';
import type { Period } from './insightsBuilder';
import { getInsights } from './insightsService';
import type { Insights } from './types';
import { getCurrentUserId } from '@/auth/currentUser';

// The last Insights of each range for the signed-in account, kept in memory: coming back to the tab or to a range
// shows its numbers at once and fetches them again behind it (no spinner). Cleared when the account changes.
const memory = new Map<string, Insights>();
let memoryOwner: string | null = null;

function remembered(period: Period, extended: boolean): Insights | null {
  const owner = getCurrentUserId();
  if (owner !== memoryOwner) {
    memory.clear();
    memoryOwner = owner;
  }
  return memory.get(`${period}:${extended}`) ?? null;
}

// `extended`: the plan allows the long periods and the 12-month trend. `enabled` waits for the plan to be known, so the
// data is not loaded twice (first as Free, then as Premium).
export function useInsights(period: Period, extended: boolean, enabled = true) {
  // The period the data was loaded for; data of another period is not shown (the screen spins instead).
  const [loaded, setLoaded] = useState<{ period: Period; insights: Insights } | null>(null);
  const saved = remembered(period, extended);
  const data = loaded?.period === period ? loaded.insights : saved;
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const failed = useCallback((error: unknown) => {
    const why = describeFailure(error);
    if (__DEV__) console.warn('Insights failed:', why);
    setFailure(why);
  }, []);

  const store = useCallback(
    (insights: Insights) => {
      remembered(period, extended); // makes sure the memory belongs to this account
      memory.set(`${period}:${extended}`, insights);
      setLoaded({ period, insights });
      setStatus('ready');
    },
    [period, extended],
  );

  // Keeps what is on screen when a reload fails, unless there was nothing to show.
  const reload = useCallback(async () => {
    try {
      store(await getInsights(period, extended));
    } catch (error) {
      failed(error);
      setStatus((current) => (current === 'ready' || memory.has(`${period}:${extended}`) ? 'ready' : 'error'));
    }
  }, [period, extended, failed, store]);

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    getInsights(period, extended)
      .then((result) => {
        if (active) store(result);
      })
      .catch((error: unknown) => {
        if (!active) return;
        failed(error);
        // Saved numbers stay on screen when the server cannot be reached.
        setStatus(remembered(period, extended) ? 'ready' : 'error');
      });
    return () => {
      active = false;
    };
  }, [period, extended, enabled, failed, store]);

  const refresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const retry = async () => {
    setStatus('loading');
    await reload();
  };

  return { data, status: data ? ('ready' as const) : status, failure, refreshing, refresh, retry, reload };
}
