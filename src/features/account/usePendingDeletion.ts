import { router } from 'expo-router';
import { useEffect } from 'react';

import { getOpenDeletion } from './deletionApi';

// After sign-in (password, Google or a saved session): if this account is scheduled for deletion, the restore screen
// comes first. A failure to ask changes nothing; the check runs again on the next sign-in.
export function usePendingDeletion(enabled: boolean, userId: string | null) {
  useEffect(() => {
    if (!enabled || !userId) return;
    let active = true;
    getOpenDeletion()
      .then((request) => {
        if (active && request) {
          router.replace({ pathname: '/account-restore', params: { id: request.id, purgeAfter: request.purgeAfter } });
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [enabled, userId]);
}
