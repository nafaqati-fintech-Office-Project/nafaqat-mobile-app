import { useCallback, useEffect, useState } from 'react';

import { getBudgetForPeriod } from './budgetService';
import type { Budget } from './types';
import type { Period } from '@/features/insights/insightsBuilder';

// budget is null both before the first answer and when the user has no budget; status tells them apart.
export function useBudget(period: Period) {
  // The period the budget was loaded for; one of another period is not shown (the spinner is).
  const [loaded, setLoaded] = useState<{ period: Period; budget: Budget | null } | null>(null);
  const budget = loaded?.period === period ? loaded.budget : null;
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const waiting = loaded?.period !== period && status === 'ready';

  // Keeps what is on screen when a reload fails, unless there was nothing to show.
  const reload = useCallback(async () => {
    try {
      setLoaded({ period, budget: await getBudgetForPeriod(period) });
      setStatus('ready');
    } catch {
      setStatus((current) => (current === 'ready' ? current : 'error'));
    }
  }, [period]);

  useEffect(() => {
    let active = true;
    getBudgetForPeriod(period)
      .then((result) => {
        if (!active) return;
        setLoaded({ period, budget: result });
        setStatus('ready');
      })
      .catch(() => active && setStatus('error'));
    return () => {
      active = false;
    };
  }, [period]);

  const refresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const retry = async () => {
    setStatus('loading');
    await reload();
  };

  return { budget, status: waiting ? 'loading' : status, refreshing, refresh, retry, reload };
}
