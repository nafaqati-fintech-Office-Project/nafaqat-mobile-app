import { useCallback, useEffect, useState } from 'react';

import {
  getBudgetUtilization,
  getDashboard,
  getFamily,
  listFamilies,
  listFamilyInvitations,
  listMembers,
  listMyInvitations,
  listSharedTransactions,
} from './familyApi';
import type { BudgetUtilization, Family, FamilyDashboard, Invitation, Member, SharedTransaction } from './types';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

// Loads when enabled, then reload() keeps what is on screen when it fails, unless there was nothing to show.
function useLoader<T>(load: () => Promise<T>, enabled = true) {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<LoadStatus>(enabled ? 'loading' : 'idle');
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
    if (!enabled) return;
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
  }, [load, enabled]);

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

export function useFamilies() {
  const { data, ...rest } = useLoader<Family[]>(listFamilies);
  return { families: data ?? [], ...rest };
}

export function useMyInvitations() {
  const load = useCallback(() => listMyInvitations('PENDING'), []);
  const { data, ...rest } = useLoader<Invitation[]>(load);
  return { invitations: data ?? [], ...rest };
}

// Everything one family's screen shows. Each part loads on its own, so a failing one never hides the others.
export function useFamilyDetail(id: string) {
  const familyLoad = useCallback(() => getFamily(id), [id]);
  const family = useLoader<Family>(familyLoad);
  const role = family.data?.myRole ?? null;
  const manager = role === 'OWNER' || role === 'ADMIN';

  const membersLoad = useCallback(() => listMembers(id), [id]);
  const members = useLoader<Member[]>(membersLoad);

  const dashboardLoad = useCallback(() => getDashboard(id), [id]);
  const dashboard = useLoader<FamilyDashboard>(dashboardLoad);

  const budgetId = dashboard.data?.budget.state === 'available' ? dashboard.data.budget.budgetId : null;
  const utilizationLoad = useCallback(() => getBudgetUtilization(id, budgetId ?? ''), [id, budgetId]);
  const utilization = useLoader<BudgetUtilization>(utilizationLoad, budgetId !== null);

  const invitesLoad = useCallback(() => listFamilyInvitations(id, 'PENDING'), [id]);
  const invitations = useLoader<Invitation[]>(invitesLoad, manager);

  const shared = useSharedTransactions(id);

  const reloadAll = useCallback(async () => {
    await Promise.all([
      family.reload(),
      members.reload(),
      dashboard.reload(),
      manager ? invitations.reload() : Promise.resolve(),
      shared.reload(),
    ]);
    // Their dependencies are stable functions of the id; the reloads above are the point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family.reload, members.reload, dashboard.reload, invitations.reload, shared.reload, manager]);

  return { family, members, dashboard, utilization, invitations, shared, role, reloadAll };
}

// The shared transactions page by page: more() appends the next one.
export function useSharedTransactions(familyId: string) {
  const [items, setItems] = useState<SharedTransaction[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [loadingMore, setLoadingMore] = useState(false);

  const reload = useCallback(async () => {
    try {
      const first = await listSharedTransactions(familyId, 0);
      setItems(first.items);
      setPage(first.page);
      setHasMore(first.hasMore);
      setStatus('ready');
    } catch {
      setStatus((current) => (current === 'ready' ? current : 'error'));
    }
  }, [familyId]);

  useEffect(() => {
    let active = true;
    listSharedTransactions(familyId, 0)
      .then((first) => {
        if (!active) return;
        setItems(first.items);
        setPage(first.page);
        setHasMore(first.hasMore);
        setStatus('ready');
      })
      .catch(() => active && setStatus('error'));
    return () => {
      active = false;
    };
  }, [familyId]);

  const more = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await listSharedTransactions(familyId, page + 1);
      setItems((current) => [...current, ...next.items.filter((row) => !current.some((c) => c.id === row.id))]);
      setPage(next.page);
      setHasMore(next.hasMore);
    } catch {
      // The rows already shown stay; tapping "more" again retries.
    } finally {
      setLoadingMore(false);
    }
  };

  return { items, status, hasMore, loadingMore, more, reload };
}
