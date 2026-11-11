import { useCallback, useEffect, useRef, useState } from 'react';

import { getDashboard } from './dashboardService';
import type { DashboardData } from './types';
import type { Period } from '@/features/insights/insightsBuilder';

// onLoaded: called when a load for `period` finishes (not for silent reloads), so a screen can decide to look
// at a wider period when this one is empty.
export function useDashboard(period: Period, onLoaded?: (period: Period, data: DashboardData) => void) {
  const loadedCallback = useRef(onLoaded);
  useEffect(() => {
    loadedCallback.current = onLoaded;
  });
  // The period the data was loaded for; data of another period is not shown (the skeleton is).
  const [loaded, setLoaded] = useState<{ period: Period; data: DashboardData } | null>(null);
  const data = loaded?.period === period ? loaded.data : null;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setLoaded({ period, data: await getDashboard(period) });
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [period]);

  // No spinner, and a failure keeps what is on screen: used when the tab is shown again.
  const reloadSilently = useCallback(async () => {
    try {
      setLoaded({ period, data: await getDashboard(period) });
      setError(false);
    } catch {
      // the next pull to refresh shows the error
    }
  }, [period]);

  useEffect(() => {
    let active = true;
    getDashboard(period)
      .then((result) => {
        if (!active) return;
        setLoaded({ period, data: result });
        setError(false);
        loadedCallback.current?.(period, result);
      })
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [period]);

  return { data, loading, error, refresh, reloadSilently };
}
