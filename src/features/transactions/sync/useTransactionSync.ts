import { useEffect } from 'react';
import { AppState } from 'react-native';

import { onTransactionsChanged } from '../transactionsRepo';
import { syncTransactions } from './transactionSync';

// While signed in to a real account, sends the phone's transactions to the server: now, each time the
// app comes back to the foreground, and whenever transactions change (a new SMS, a category change, a
// late model answer).
export function useTransactionSync(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    void syncTransactions();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncTransactions();
    });
    const unsubscribe = onTransactionsChanged(() => void syncTransactions());
    return () => {
      sub.remove();
      unsubscribe();
    };
  }, [enabled]);
}
