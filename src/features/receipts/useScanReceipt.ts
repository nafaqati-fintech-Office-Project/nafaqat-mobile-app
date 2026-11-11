import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Platform } from 'react-native';

import { showToast } from '@/components/Toast';
import { useLanguage } from '@/i18n/LanguageProvider';

import { chooseReceiptPdf, chooseReceiptPhoto, takeReceiptPhoto, type PickResult } from './pickReceipt';
import { readReceipt } from './receiptApi';

// Asks where the receipt is, reads it on the server, then opens the add-expense form filled in for review.
export function useScanReceipt() {
  const { t } = useLanguage();
  const [scanning, setScanning] = useState(false);

  const scan = useCallback(
    async (pick: () => Promise<PickResult>) => {
      setScanning(true);
      try {
        const file = await pick();
        if (file === 'denied') return showToast(t('receipts.cameraDenied'));
        if (file === 'unsupported') return showToast(t('receipts.needsUpdate'));
        if (file === 'canceled') return;
        const result = await readReceipt(file);
        if (typeof result === 'string') return showToast(t(result === 'unreadable' ? 'receipts.unreadable' : 'receipts.unavailable'));
        router.push({
          pathname: '/transaction-add',
          params: {
            scanned: '1',
            amount: result.amount,
            currency: result.currency ?? '',
            merchant: result.merchant ?? '',
            category: result.category ?? '',
            date: result.date ?? '',
          },
        });
      } catch {
        showToast(t('receipts.unreadable'));
      } finally {
        setScanning(false);
      }
    },
    [t],
  );

  const start = useCallback(() => {
    Alert.alert(t('receipts.chooseTitle'), undefined, [
      { text: t('receipts.camera'), onPress: () => void scan(takeReceiptPhoto) },
      { text: t('receipts.library'), onPress: () => void scan(chooseReceiptPhoto) },
      { text: t('receipts.pdf'), onPress: () => void scan(chooseReceiptPdf) },
      // Android shows three buttons at most; tapping outside the dialog closes it there.
      ...(Platform.OS === 'ios' ? [{ text: t('notifications.cancel'), style: 'cancel' as const }] : []),
    ]);
  }, [scan, t]);

  return { scanning, start };
}
