import { loadNotifications } from './loadNotifications';
import type { ParsedTxn } from '@/features/sms/parser/types';

const CHANNEL_ID = 'transactions';

// Banners (local ones and pushes) also show while the app is open.
export function presentInForeground(Notifications: NonNullable<Awaited<ReturnType<typeof loadNotifications>>>): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

// false where notifications cannot run (see loadNotifications) or the user said no.
export async function ensureNotificationPermission(): Promise<boolean> {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;
  presentInForeground(Notifications);
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
    if (!Notifications) return;
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
    if (!Notifications) return;
    await Notifications.scheduleNotificationAsync({
      content: buildNotificationContent(txn, category),
      trigger: { channelId: CHANNEL_ID },
    });
  } catch {
    // A failed notification must not stop the pipeline.
  }
}

// ---- "Please check this one": a transaction the app could not categorize ----------------------------

const RECHECK_CHANNEL_ID = 'recheck';

export type RecheckItem = { id: number | null; label: string; amount?: string; currency?: string };

// One transaction: names it and opens its category screen. Several at once: one banner that opens the list,
// so a batch never turns into a stream of banners. `data` is read by notificationLink (referenceType RECHECK).
export function buildRecheckContent(items: RecheckItem[]) {
  if (items.length === 1) {
    const [item] = items;
    const money = item.amount ? ` (${item.amount}${item.currency ? ` ${item.currency}` : ''})` : '';
    return {
      title: 'Please check this transaction',
      body: `We could not tell the category of ${item.label}${money}. Tap to choose one.`,
      data: { referenceType: 'RECHECK', referenceId: item.id === null ? null : String(item.id) },
    };
  }
  return {
    title: `${items.length} transactions need a category`,
    body: 'We could not categorize them. Tap to review.',
    data: { referenceType: 'RECHECK', referenceId: null },
  };
}

// A banner asking the user to recheck transactions left Uncategorized. Never throws and never blocks the pipeline.
export async function notifyRecheck(items: RecheckItem[]): Promise<void> {
  if (items.length === 0) return;
  try {
    if (!(await ensureNotificationPermission())) return;
    const Notifications = await loadNotifications();
    if (!Notifications) return;
    await Notifications.setNotificationChannelAsync(RECHECK_CHANNEL_ID, {
      name: 'Transactions to check',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.scheduleNotificationAsync({
      content: buildRecheckContent(items),
      trigger: { channelId: RECHECK_CHANNEL_ID },
    });
  } catch {
    // A failed banner must not stop the pipeline.
  }
}
