import { useCallback, useEffect, useRef, useState } from 'react';

import type { TransactionFilter, TransactionItem } from './transactionsApi';
import { getTransactionPage } from './transactionsService';

const PAGE_SIZE = 30;
const SEARCH_DEBOUNCE_MS = 350;

// The first page's outcome for one filter + search; a result for another key means "loading".
type Result = { key: string; status: 'ready' | 'error'; items: TransactionItem[] };

// Appends a page, skipping rows already shown (a row added on the server shifts later pages by one).
function merge(current: TransactionItem[], next: TransactionItem[]): TransactionItem[] {
  const seen = new Set(current.map((row) => row.id));
  return [...current, ...next.filter((row) => !seen.has(row.id))];
}

export function useTransactionList(filter: TransactionFilter, query: string) {
  const [search, setSearch] = useState(query);
  const [result, setResult] = useState<Result | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const page = useRef(0);
  const hasMore = useRef(false);
  // Each request gets a number; a reply for an older filter or search is dropped.
  const request = useRef(0);

  const key = `${filter}\n${search}`;
  const status = result?.key === key ? result.status : 'loading';

  useEffect(() => {
    const timer = setTimeout(() => setSearch(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetches the first page; keepOnError leaves the rows on screen when a background reload fails.
  const fetchFirst = useCallback(
    (keepOnError: boolean) => {
      const id = ++request.current;
      return getTransactionPage({ filter, search, page: 0, size: PAGE_SIZE })
        .then((next) => {
          if (id !== request.current) return;
          page.current = next.page;
          hasMore.current = next.hasMore;
          setMoreFailed(false);
          setResult({ key: `${filter}\n${search}`, status: 'ready', items: next.items });
        })
        .catch(() => {
          if (id !== request.current || keepOnError) return;
          setResult({ key: `${filter}\n${search}`, status: 'error', items: [] });
        });
    },
    [filter, search],
  );

  useEffect(() => {
    void fetchFirst(false);
  }, [fetchFirst, attempt]);

  const retry = () => {
    setResult(null);
    setAttempt((n) => n + 1);
  };

  const refresh = async () => {
    setRefreshing(true);
    await fetchFirst(status === 'ready');
    setRefreshing(false);
  };

  // Stable, so a screen can call it on focus without a new filter or search counting as a focus.
  const latestFetch = useRef(fetchFirst);
  useEffect(() => {
    latestFetch.current = fetchFirst;
  }, [fetchFirst]);
  const reloadSilently = useCallback(() => latestFetch.current(true), []);

  const loadMore = useCallback(async () => {
    if (!hasMore.current || loadingMore || status !== 'ready') return;
    const id = request.current;
    setLoadingMore(true);
    try {
      const next = await getTransactionPage({ filter, search, page: page.current + 1, size: PAGE_SIZE });
      if (id !== request.current) return;
      page.current = next.page;
      hasMore.current = next.hasMore;
      setMoreFailed(false);
      setResult((current) => current && { ...current, items: merge(current.items, next.items) });
    } catch {
      if (id === request.current) setMoreFailed(true);
    } finally {
      setLoadingMore(false);
    }
  }, [filter, search, loadingMore, status]);

  return {
    items: status === 'ready' ? (result?.items ?? []) : [],
    status,
    refreshing,
    loadingMore,
    moreFailed,
    retry,
    refresh,
    reloadSilently,
    loadMore,
  };
}
