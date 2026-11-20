import { useEffect } from 'react';
import { AppState } from 'react-native';

import { updateLocalModel } from './localModelStore';

// While signed in (so the gateway accepts the call), checks that the phone runs the model the server
// uses: once now and each time the app comes back to the foreground. Costs one tiny request when
// nothing changed; a new model is a background download that the user never sees.
export function useLocalModelUpdate(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    void updateLocalModel();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void updateLocalModel();
    });
    return () => sub.remove();
  }, [enabled]);
}
