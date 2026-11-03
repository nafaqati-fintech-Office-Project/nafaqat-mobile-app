import { useCallback, useEffect, useRef, useState } from 'react';

import { currentPeriod, getReport, type Period } from './reportsService';
import type { Report } from './types';

export const OLDEST_MONTHS_BACK = 24;

const index = ({ year, month }: Period) => year * 12 + (month - 1);
const fromIndex = (value: number): Period => ({ year: Math.floor(value / 12), month: (value % 12) + 1 });

export function useReport() {
  const [now, setNow] = useState<Period | null>(null); // the current month; null until known
  const [period, setPeriod] = useState<Period | null>(null);
  const [data, setData] = useState<Report | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const latest = useRef<Period | null>(null); // ignores an answer for a month the user has already left

  const load = useCallback(async (target: Period, keepOnError: boolean) => {
    latest.current = target;
    try {
      const report = await getReport(target);
      if (latest.current !== target) return;
      setData(report);
      setStatus('ready');
    } catch {
      if (latest.current !== target) return;
      setStatus((current) => (keepOnError && current === 'ready' ? current : 'error'));
    }
  }, []);

  useEffect(() => {
    let active = true;
    currentPeriod().then((start) => {
      if (!active) return;
      setNow(start);
      setPeriod(start);
      void load(start, false);
    });
    return () => {
      active = false;
    };
  }, [load]);

  const move = (step: 1 | -1) => {
    if (!period || !now) return;
    const next = index(period) + step;
    if (next > index(now) || next < index(now) - OLDEST_MONTHS_BACK) return;
    const target = fromIndex(next);
    setPeriod(target);
    setStatus('loading');
    void load(target, false);
  };

  const refresh = async () => {
    if (!period) return;
    setRefreshing(true);
    await load(period, true);
    setRefreshing(false);
  };

  const retry = async () => {
    if (!period) return;
    setStatus('loading');
    await load(period, false);
  };

  const canGoNext = !!period && !!now && index(period) < index(now);
  const canGoPrevious = !!period && !!now && index(period) > index(now) - OLDEST_MONTHS_BACK;

  return { period, data, status, refreshing, refresh, retry, previous: () => move(-1), next: () => move(1), canGoNext, canGoPrevious };
}
