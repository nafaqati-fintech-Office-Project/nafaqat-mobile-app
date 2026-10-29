import { useEffect } from 'react';
import { AppState } from 'react-native';

import { syncFeedback } from './feedbackSync';
import { onTransactionsChanged } from '@/features/transactions/transactionsRepo';

// While signed in to a real account, sends category changes to the model's feedback log: now, each time
// the app comes back to the foreground, and after transactions change (a category change emits this).
export function useFeedbackSync(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    void syncFeedback();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncFeedback();
    });
    const unsubscribe = onTransactionsChanged(() => void syncFeedback());
    return () => {
      sub.remove();
      unsubscribe();
    };
  }, [enabled]);
}
