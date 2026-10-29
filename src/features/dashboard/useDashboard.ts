import { useCallback, useEffect, useState } from 'react';

import { getDashboard } from './dashboardService';
import type { DashboardData } from './types';

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getDashboard());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // No spinner, and a failure keeps what is on screen: used when the tab is shown again.
  const reloadSilently = useCallback(async () => {
    try {
      setData(await getDashboard());
      setError(false);
    } catch {
      // the next pull to refresh shows the error
    }
  }, []);

  useEffect(() => {
    let active = true;
    getDashboard()
      .then((result) => active && setData(result))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { data, loading, error, refresh, reloadSilently };
}
