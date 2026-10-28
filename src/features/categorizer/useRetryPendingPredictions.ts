import { useEffect } from 'react';
import { AppState } from 'react-native';

import { onModelAvailable } from './modelClient';
import { retryPendingPredictions } from './retryPending';

// While signed in (so the gateway accepts the call), re-asks the model for transactions saved
// while it was unreachable: once now, each time the app comes back to the foreground, and as soon
// as the model answers again after being unreachable.
export function useRetryPendingPredictions(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    void retryPendingPredictions();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void retryPendingPredictions();
    });
    const unsubscribe = onModelAvailable(() => void retryPendingPredictions());
    return () => {
      sub.remove();
      unsubscribe();
    };
  }, [enabled]);
}
