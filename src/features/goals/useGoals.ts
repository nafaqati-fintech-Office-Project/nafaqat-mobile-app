import { useCallback, useEffect, useState } from 'react';

import { getGoalWithHistory, listGoals } from './goalsApi';
import type { Contribution, Goal } from './types';

type Status = 'loading' | 'ready' | 'error';

// Loads once, then reload() keeps what is on screen when it fails, unless there was nothing to show.
function useLoader<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    try {
      setData(await load());
      setStatus('ready');
    } catch {
      setStatus((current) => (current === 'ready' ? current : 'error'));
    }
  }, [load]);

  useEffect(() => {
    let active = true;
    load()
      .then((next) => {
        if (!active) return;
        setData(next);
        setStatus('ready');
      })
      .catch(() => active && setStatus('error'));
    return () => {
      active = false;
    };
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const retry = async () => {
    setStatus('loading');
    await reload();
  };

  return { data, status, refreshing, reload, refresh, retry };
}

export function useGoals() {
  const { data, ...rest } = useLoader(listGoals);
  return { goals: data ?? [], ...rest };
}

export function useGoal(id: string) {
  const load = useCallback(() => getGoalWithHistory(id), [id]);
  const { data, ...rest } = useLoader<{ goal: Goal; contributions: Contribution[] }>(load);
  return { goal: data?.goal ?? null, contributions: data?.contributions ?? [], ...rest };
}
