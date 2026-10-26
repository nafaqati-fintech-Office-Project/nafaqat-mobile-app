import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { scanInbox, startSmsListener, stopSmsListener } from './listener';
import { processSms } from './processSms';
import { checkSmsPermission } from './smsPermission';
import type { SmsMessage } from './smsReader';
import { ensureNotificationPermission, notifyTransaction } from '@/features/notifications/notify';
import { saveTransaction } from '@/features/transactions/transactionsRepo';
import { saveIfMissed } from '@/features/transactions/unparsedRepo';

const LOG_LIMIT = 20;

export type LogItem = {
  id: string;
  time: number;
  parsed: boolean;
  duplicate: boolean;
  unparsed?: boolean;
  category?: string;
  source?: string;
};

export function useSmsPipeline() {
  const [listening, setListening] = useState(false);
  const [log, setLog] = useState<LogItem[]>([]);

  const handleSms = useCallback(async (sms: SmsMessage) => {
    const result = await processSms(sms);
    const isNew = result ? await saveTransaction(result).catch(() => true) : false;
    if (result && isNew) await notifyTransaction(result);
    const unparsed = result ? false : await saveIfMissed(sms).catch(() => false);
    const item: LogItem = {
      id: sms.id,
      time: Date.now(),
      parsed: result !== null,
      duplicate: result !== null && !isNew,
      unparsed,
      category: result?.category,
      source: result?.source,
    };
    setLog((prev) => [item, ...prev].slice(0, LOG_LIMIT));
  }, []);

  const toggle = useCallback(
    async (on: boolean) => {
      if (!on) {
        stopSmsListener();
        setListening(false);
        return;
      }
      if ((await checkSmsPermission()) !== 'granted') return;
      await ensureNotificationPermission();
      startSmsListener(handleSms);
      setListening(true);
    },
    [handleSms],
  );

  useEffect(() => {
    if (!listening) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void scanInbox();
    });
    return () => sub.remove();
  }, [listening]);

  useEffect(() => stopSmsListener, []);

  return { listening, log, toggle };
}
