import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';

import { importHistory } from './importHistory';
import { isSmsListening, scanInbox, startSmsListener, stopSmsListener } from './listener';
import { processSms, type ProcessedSms } from './processSms';
import { checkSmsPermission } from './smsPermission';
import type { SmsMessage } from './smsReader';
import { checkBudgetOnPhone } from '@/features/notifications/budgetAlertService';
import { ensureNotificationPermission, notifyRecheck, notifyTransaction } from '@/features/notifications/notify';
import { emitTransactionsChanged, findTransactionId, saveTransaction } from '@/features/transactions/transactionsRepo';
import { saveIfMissed } from '@/features/transactions/unparsedRepo';

// Reading the bank SMS for the signed-in user, without any screen having to be open: once the SMS permission is granted
// the app imports the inbox history once and then keeps watching for new messages while it is open. The user can switch
// it off from the Bank SMS screen; that choice is kept.
const OFF_KEY = 'smsAutoOff';
const importedKey = (userId: string) => `smsInitialImportDone:${userId}`;
const HISTORY_LIMIT = 500;

export type LogItem = {
  id: string;
  time: number;
  parsed: boolean;
  duplicate: boolean;
  unparsed?: boolean;
  category?: string;
  source?: string;
};

// A parsed and categorized transaction: save it, and when it is new tell the user and check the budget.
export async function saveProcessed(result: ProcessedSms): Promise<boolean> {
  const isNew = await saveTransaction(result).catch(() => true);
  if (isNew) {
    emitTransactionsChanged();
    // A transaction the model could not categorize (and is not waiting to be asked again) asks the user to
    // check it, instead of the usual banner. Ones waiting for the model are announced when the retry ends.
    if (result.category === 'Uncategorized' && !result.retry) {
      const id = await findTransactionId(result.txn).catch(() => null);
      await notifyRecheck([{ id, label: result.txn.merchant ?? result.txn.bank, amount: result.txn.amount, currency: result.txn.currency }]);
    } else {
      await notifyTransaction(result);
    }
    if (result.txn.type === 'DEBIT') await checkBudgetOnPhone();
  }
  return isNew;
}

// One incoming message: parse it, save it, tell the user, and check the budget. Used by the always-on watcher and by the
// Bank SMS screen (which also shows the result in its log).
export async function handleIncomingSms(sms: SmsMessage): Promise<LogItem> {
  const result = await processSms(sms);
  const isNew = result ? await saveProcessed(result) : false;
  const unparsed = result ? false : await saveIfMissed(sms).catch(() => false);
  return {
    id: sms.id,
    time: Date.now(),
    parsed: result !== null,
    duplicate: result !== null && !isNew,
    unparsed,
    category: result?.category,
    source: result?.source,
  };
}

let foreground: { remove: () => void } | null = null;
let starting = false;

const watch = () => startSmsListener((sms) => void handleIncomingSms(sms));

function rescanWhenOpened() {
  foreground?.remove();
  foreground = AppState.addEventListener('change', (state) => {
    if (state === 'active') void scanInbox();
  });
}

export async function isSmsAutoOff(): Promise<boolean> {
  return (await AsyncStorage.getItem(OFF_KEY).catch(() => null)) === '1';
}

export async function setSmsAutoOff(off: boolean): Promise<void> {
  if (off) await AsyncStorage.setItem(OFF_KEY, '1');
  else await AsyncStorage.removeItem(OFF_KEY);
}

// Starts everything that is allowed right now. Safe to call again and again (app start, after the permission is granted).
// Returns without doing anything off Android, without the SMS permission, or when the user switched it off.
export async function ensureSmsSync(userId: string): Promise<void> {
  if (Platform.OS !== 'android' || starting) return;
  starting = true;
  try {
    if ((await isSmsAutoOff()) || (await checkSmsPermission()) !== 'granted') return;
    await ensureNotificationPermission();
    if (!isSmsListening()) watch();
    rescanWhenOpened();
    const key = importedKey(userId);
    if ((await AsyncStorage.getItem(key)) !== '1') {
      await importHistory(HISTORY_LIMIT);
      await AsyncStorage.setItem(key, '1'); // only after it worked, so an offline start tries again next time
    }
  } catch {
    // The watcher keeps polling; the import is tried again at the next start.
  } finally {
    starting = false;
  }
}

export function stopSmsSync(): void {
  foreground?.remove();
  foreground = null;
  stopSmsListener();
}

// The Bank SMS screen takes over the callback while it is open (to show its log); this hands it back.
export function resumeSmsSync(): void {
  if (isSmsListening()) watch();
}
