import { useEffect } from 'react';
import { AppState } from 'react-native';

import { onTransactionsChanged } from '../transactionsRepo';
import { refreshDashboards } from '@/features/dashboard/dashboardStore';
import { syncTransactions } from './transactionSync';
import { claimLocalRows } from './syncOwner';

// While signed in to a real account, sends the phone's transactions to the server: now, each time the
// app comes back to the foreground, and whenever transactions change (a new SMS, a category change, a
// late model answer). The first run checks that the rows already on the phone belong to this account (see
// claimLocalRows), so signing in with another account sends them to that one too.
// Rows that reached the server change the dashboard's numbers, so the saved dashboards are fetched again right after.
const syncAndRefresh = () =>
  syncTransactions().then((synced) => {
    if (synced > 0) void refreshDashboards();
  });

export function useTransactionSync(enabled: boolean, userId: string | null): void {
  useEffect(() => {
    if (!enabled) return;
    void (userId ? claimLocalRows(userId) : Promise.resolve(false)).then(syncAndRefresh);
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void syncAndRefresh();
      // Back in the foreground: anything older than a couple of minutes is fetched again.
      void refreshDashboards({ onlyIfStale: true });
    });
    const unsubscribe = onTransactionsChanged(() => void syncAndRefresh());
    return () => {
      sub.remove();
      unsubscribe();
    };
  }, [enabled, userId]);
}
