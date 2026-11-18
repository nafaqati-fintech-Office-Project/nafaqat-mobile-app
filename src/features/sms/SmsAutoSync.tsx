import { useEffect } from 'react';

import { ensureSmsSync, stopSmsSync } from './smsSync';
import { useAuth } from '@/auth/AuthProvider';

// Mounted once for the whole app. While someone is signed in (and has allowed SMS access) their bank messages are
// imported and watched without opening any screen; signing out stops it.
export function SmsAutoSync() {
  const { status, user } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    if (status !== 'authenticated' || !userId) {
      stopSmsSync();
      return;
    }
    void ensureSmsSync(userId);
    return stopSmsSync;
  }, [status, userId]);

  return null;
}
