import type { ParsedTxn } from '@/features/sms/parser/types';

const CHANNEL_ID = 'transactions';

// Loaded on first use: importing expo-notifications touches native modules at once, which would
// crash the whole app at startup in a build or in Expo Go that does not contain them.
const loadNotifications = () => import('expo-notifications');

export async function ensureNotificationPermission(): Promise<boolean> {
  const Notifications = await loadNotifications();
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Transactions',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

export function buildNotificationContent(txn: ParsedTxn, category: string) {
  const kind = txn.type === 'DEBIT' ? 'Debit' : 'Credit';
  const card = txn.cardLast4 ? ` · card ****${txn.cardLast4}` : '';
  return {
    title: `${txn.amount} ${txn.currency} · ${txn.merchant ?? txn.bank}`,
    body: `${category} · ${kind}${card}`,
  };
}

const ALERT_CHANNEL_ID = 'budget-alerts';

// A banner for a budget or large-payment alert. `data` says where tapping it goes (see
// notificationLink): referenceType, referenceId, categoryCode.
export async function notifyAlert(content: {
  title: string;
  body: string;
  data: Record<string, string | null>;
}): Promise<void> {
  try {
    if (!(await ensureNotificationPermission())) return;
    const Notifications = await loadNotifications();
    await Notifications.setNotificationChannelAsync(ALERT_CHANNEL_ID, {
      name: 'Budget alerts',
      importance: Notifications.AndroidImportance.HIGH,
    });
    await Notifications.scheduleNotificationAsync({
      content: { title: content.title, body: content.body, data: content.data },
      trigger: { channelId: ALERT_CHANNEL_ID },
    });
  } catch {
    // A failed banner must not stop polling or the SMS pipeline.
  }
}

export async function notifyTransaction({
  txn,
  category,
}: {
  txn: ParsedTxn;
  category: string;
}): Promise<void> {
  try {
    const Notifications = await loadNotifications();
    await Notifications.scheduleNotificationAsync({
      content: buildNotificationContent(txn, category),
      trigger: { channelId: CHANNEL_ID },
    });
  } catch {
    // A failed notification must not stop the pipeline.
  }
}
