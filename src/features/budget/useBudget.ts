import { useCallback, useEffect, useState } from 'react';

import { getCurrentBudget } from './budgetService';
import type { Budget } from './types';

// budget is null both before the first answer and when the user has no budget; status tells them apart.
export function useBudget() {
  const [budget, setBudget] = useState<Budget | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);

  // Keeps what is on screen when a reload fails, unless there was nothing to show.
  const reload = useCallback(async () => {
    try {
      setBudget(await getCurrentBudget());
      setStatus('ready');
    } catch {
      setStatus((current) => (current === 'ready' ? current : 'error'));
    }
  }, []);

  useEffect(() => {
    let active = true;
    getCurrentBudget()
      .then((result) => {
        if (!active) return;
        setBudget(result);
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

  return { budget, status, refreshing, refresh, retry, reload };
}
