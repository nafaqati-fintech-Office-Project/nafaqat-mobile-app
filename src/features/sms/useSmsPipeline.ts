import { useCallback, useEffect, useState } from 'react';

import { isSmsListening, startSmsListener, stopSmsListener } from './listener';
import { checkSmsPermission } from './smsPermission';
import type { SmsMessage } from './smsReader';
import { handleIncomingSms, resumeSmsSync, setSmsAutoOff, type LogItem } from './smsSync';
import { ensureNotificationPermission } from '@/features/notifications/notify';

export type { LogItem };

const LOG_LIMIT = 20;

// The Bank SMS screen's view of the watcher. The watcher itself runs for the whole app (see smsSync); this screen shows
// its log while open, and its switch turns the watcher on or off for good (the choice is kept across restarts).
export function useSmsPipeline() {
  const [listening, setListening] = useState(isSmsListening);
  const [log, setLog] = useState<LogItem[]>([]);

  const handleSms = useCallback(async (sms: SmsMessage) => {
    const item = await handleIncomingSms(sms);
    setLog((prev) => [item, ...prev].slice(0, LOG_LIMIT));
  }, []);

  // While the screen is open, new messages also appear in its log.
  useEffect(() => {
    if (isSmsListening()) startSmsListener(handleSms);
    return resumeSmsSync;
  }, [handleSms]);

  const toggle = useCallback(
    async (on: boolean) => {
      if (!on) {
        await setSmsAutoOff(true);
        stopSmsListener();
        setListening(false);
        return;
      }
      if ((await checkSmsPermission()) !== 'granted') return;
      await ensureNotificationPermission();
      await setSmsAutoOff(false);
      startSmsListener(handleSms);
      setListening(true);
    },
    [handleSms],
  );

  return { listening, log, toggle };
}
