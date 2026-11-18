import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { processCaptured } from './capture';
import { sendDueReminders } from './reminder';
import { detectIosUpdate } from './status';
import { isCaptureAvailable } from '../../../modules/nafaqati-capture';
import { useAuth } from '@/auth/AuthProvider';

const TICK_MS = 30_000;

// Mounted once for the whole app, like SmsAutoSync does for Android. While someone is signed in on an iPhone, whatever
// the Shortcuts actions left in the queue is turned into transactions: at start, whenever the app comes to the front,
// and every half minute while it is open (which also settles Wallet payments that waited for their SMS).
export function IosCaptureSync() {
  const { status, user } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    if (Platform.OS !== 'ios' || !isCaptureAvailable() || status !== 'authenticated' || !userId) return;
    const run = () => void processCaptured().catch(() => undefined);
    void detectIosUpdate();
    void sendDueReminders();
    run();
    const timer = setInterval(run, TICK_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        run();
        void sendDueReminders();
      }
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [status, userId]);

  return null;
}
