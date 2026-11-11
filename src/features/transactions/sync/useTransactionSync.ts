import { useEffect } from 'react';
import { AppState } from 'react-native';

import { onTransactionsChanged } from '../transactionsRepo';
import { syncTransactions } from './transactionSync';
import { claimLocalRows } from './syncOwner';

// While signed in to a real account, sends the phone's transactions to the server: now, each time the
// app comes back to the foreground, and whenever transactions change (a new SMS, a category change, a
// late model answer). The first run checks that the rows already on the phone belong to this account (see
// claimLocalRows), so signing in with another account sends them to that one too.
export function useTransactionSync(enabled: boolean, userId: string | null): void {
  useEffect(() => {
    if (!enabled) return;
    void (userId ? claimLocalRows(userId) : Promise.resolve(false)).then(() => syncTransactions());
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncTransactions();
    });
    const unsubscribe = onTransactionsChanged(() => void syncTransactions());
    return () => {
      sub.remove();
      unsubscribe();
    };
  }, [enabled, userId]);
}
