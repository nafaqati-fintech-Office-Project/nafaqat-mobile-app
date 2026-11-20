import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import {
  hydrateDashboard,
  isDashboardLoading,
  loadDashboard,
  peekDashboard,
  subscribeDashboards,
} from './dashboardStore';
import type { DashboardData } from './types';
import { getCurrentUserId } from '@/auth/currentUser';
import { AUTH_BYPASS } from '@/config/flags';
import { getDashboard } from './dashboardService';
import type { Period } from '@/features/insights/insightsBuilder';

// onLoaded: called once per range when its numbers are first on screen (saved or fresh), so a screen can decide to look
// at a wider range when this one is empty.
//
// The numbers come from the dashboard store, which the app fills right after sign-in (see prefetchDashboards): a range
// that is loaded shows at once and changing range waits for nothing. A range being fetched again never shows a spinner;
// its new numbers simply replace the old ones.
export function useDashboard(period: Period, onLoaded?: (period: Period, data: DashboardData) => void) {
  const loadedCallback = useRef(onLoaded);
  useEffect(() => {
    loadedCallback.current = onLoaded;
  });

  const subscribe = useCallback((listener: () => void) => subscribeDashboards(listener), []);
  const stored = useSyncExternalStore(subscribe, () => peekDashboard(period));
  const fetching = useSyncExternalStore(subscribe, () => isDashboardLoading(period));

  // The demo session has no server; it keeps its own mock result here.
  const [mock, setMock] = useState<{ period: Period; data: DashboardData } | null>(null);
  const data = AUTH_BYPASS ? (mock?.period === period ? mock.data : null) : stored;
  const [failed, setFailed] = useState<Period | null>(null);
  const reported = useRef<Period | null>(null);

  useEffect(() => {
    let active = true;
    if (AUTH_BYPASS) {
      getDashboard(period)
        .then((result) => {
          if (!active) return;
          setMock({ period, data: result });
          setFailed(null);
        })
        .catch(() => active && setFailed(period));
      return () => {
        active = false;
      };
    }
    // Saved copy first (if the store has nothing yet), then a fetch unless the numbers are fresh.
    void hydrateDashboard(getCurrentUserId(), period);
    loadDashboard(period)
      .then(() => active && setFailed(null))
      .catch(() => active && setFailed(period));
    return () => {
      active = false;
    };
  }, [period]);

  useEffect(() => {
    if (!data || reported.current === period) return;
    reported.current = period;
    loadedCallback.current?.(period, data);
  }, [data, period]);

  // Pull to refresh: always asks the server.
  const refresh = useCallback(async () => {
    try {
      if (AUTH_BYPASS) setMock({ period, data: await getDashboard(period) });
      else await loadDashboard(period, { force: true });
      setFailed(null);
    } catch {
      setFailed(period);
    }
  }, [period]);

  // A failure keeps what is on screen: used when the tab is shown again.
  const reloadSilently = useCallback(async () => {
    try {
      if (AUTH_BYPASS) return;
      await loadDashboard(period);
    } catch {
      // the next pull to refresh shows the error
    }
  }, [period]);

  return {
    data,
    loading: data === null && (AUTH_BYPASS ? failed !== period : fetching),
    error: data === null && failed === period,
    refresh,
    reloadSilently,
  };
}
