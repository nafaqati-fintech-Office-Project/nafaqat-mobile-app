import { useCallback, useEffect, useState } from 'react';

import { getInsights } from './insightsService';
import type { Insights } from './types';

export function useInsights() {
  const [data, setData] = useState<Insights | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);

  // Keeps what is on screen when a reload fails, unless there was nothing to show.
  const reload = useCallback(async () => {
    try {
      setData(await getInsights());
      setStatus('ready');
    } catch {
      setStatus((current) => (current === 'ready' ? current : 'error'));
    }
  }, []);

  useEffect(() => {
    let active = true;
    getInsights()
      .then((result) => {
        if (!active) return;
        setData(result);
        setStatus('ready');
      })
      .catch(() => active && setStatus('error'));
    return () => {
      active = false;
    };
  }, []);

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
