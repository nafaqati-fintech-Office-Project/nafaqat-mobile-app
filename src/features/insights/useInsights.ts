import { useCallback, useEffect, useState } from 'react';

import type { Period } from './insightsBuilder';
import { getInsights } from './insightsService';
import type { Insights } from './types';

// `extended`: the plan allows the long periods and the 12-month trend. `enabled` waits for the plan to be known, so the
// data is not loaded twice (first as Free, then as Premium).
export function useInsights(period: Period, extended: boolean, enabled = true) {
  // The period the data was loaded for; data of another period is not shown (the screen spins instead).
  const [loaded, setLoaded] = useState<{ period: Period; insights: Insights } | null>(null);
  const data = loaded?.period === period ? loaded.insights : null;
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);

  // Keeps what is on screen when a reload fails, unless there was nothing to show.
  const reload = useCallback(async () => {
    try {
      setLoaded({ period, insights: await getInsights(period, extended) });
      setStatus('ready');
    } catch {
      setStatus((current) => (current === 'ready' ? current : 'error'));
    }
  }, [period, extended]);

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    getInsights(period, extended)
      .then((result) => {
        if (!active) return;
        setLoaded({ period, insights: result });
        setStatus('ready');
      })
      .catch(() => active && setStatus('error'));
    return () => {
      active = false;
    };
  }, [period, extended, enabled]);

  const refresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const retry = async () => {
    setStatus('loading');
    await reload();
  };

  return { data, status, refreshing, refresh, retry, reload };
}
