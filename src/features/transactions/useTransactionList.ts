import { useCallback, useEffect, useRef, useState } from 'react';

import type { TransactionFilter, TransactionItem, TransactionScope } from './transactionsApi';
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

const NO_SCOPE: TransactionScope = {};

export function useTransactionList(filter: TransactionFilter, query: string, scope: TransactionScope = NO_SCOPE) {
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

  const scopeKey = `${scope.category ?? ''}|${scope.from ?? ''}|${scope.to ?? ''}|${scope.card ?? ''}`;
  const key = `${filter}\n${search}\n${scopeKey}`;
  const status = result?.key === key ? result.status : 'loading';

  useEffect(() => {
    const timer = setTimeout(() => setSearch(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetches the first page; keepOnError leaves the rows on screen when a background reload fails.
  const fetchFirst = useCallback(
    (keepOnError: boolean) => {
      const id = ++request.current;
      return getTransactionPage({ filter, search, page: 0, size: PAGE_SIZE, scope })
        .then((next) => {
          if (id !== request.current) return;
          page.current = next.page;
          hasMore.current = next.hasMore;
          setMoreFailed(false);
          setResult({ key: `${filter}\n${search}\n${scopeKey}`, status: 'ready', items: next.items });
        })
        .catch(() => {
          if (id !== request.current || keepOnError) return;
          setResult({ key: `${filter}\n${search}\n${scopeKey}`, status: 'error', items: [] });
        });
    },
    // scope is read through scopeKey, so a new object with the same filters does not refetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filter, search, scopeKey],
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
      const next = await getTransactionPage({ filter, search, page: page.current + 1, size: PAGE_SIZE, scope });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, search, scopeKey, loadingMore, status]);

  // Takes a deleted row off the screen without waiting for a reload.
  const remove = useCallback((id: string) => {
    setResult((current) => current && { ...current, items: current.items.filter((row) => row.id !== id) });
  }, []);

  // Shows a changed category without waiting for a reload.
  const setCategory = useCallback((id: string, category: string) => {
    setResult(
      (current) =>
        current && { ...current, items: current.items.map((row) => (row.id === id ? { ...row, category } : row)) },
    );
  }, []);

  return {
    setCategory,
    items: status === 'ready' ? (result?.items ?? []) : [],
    status,
    // The search the rows were loaded for: the typed text applies after a short pause.
    appliedSearch: search,
    refreshing,
    loadingMore,
    moreFailed,
    retry,
    refresh,
    reloadSilently,
    loadMore,
    remove,
  };
}
