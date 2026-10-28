import { useEffect } from 'react';
import { AppState } from 'react-native';

import { retryPendingPredictions } from './retryPending';

// While signed in (so the gateway accepts the call), re-asks the model for transactions saved
// while it was unreachable: once now and each time the app comes back to the foreground.
export function useRetryPendingPredictions(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    void retryPendingPredictions();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void retryPendingPredictions();
    });
    return () => sub.remove();
  }, [enabled]);
}
