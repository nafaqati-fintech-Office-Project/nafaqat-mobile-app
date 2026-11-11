import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { categorize, categorizeLocally } from './categorize';
import { getCurrentUserId } from '@/auth/currentUser';
import type { ParsedTxn } from '@/features/sms/parser/types';
import {
  emitTransactionsChanged,
  listRecategorizeCandidates,
  saveRecategorized,
} from '@/features/transactions/transactionsRepo';
import { devLog } from '@/utils/devLog';

// Bump when the rules or the lookup list change enough to be worth another pass over saved transactions.
const VERSION = 1;
const RUN_LIMIT = 1000;
const flagKey = (userId: string) => `recategorize.v${VERSION}:${userId}`;

let running: Promise<number> | null = null;

// The original SMS text is not stored, so it is read again from the phone's inbox by its id. null when the
// message is gone, or there is no inbox to read (iOS, web). Throws when the inbox cannot be read at all.
async function readRaw(smsId: string): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  const { readSmsById } = await import('@/features/sms/smsReader');
  return (await readSmsById(smsId))?.body ?? null;
}

// Looks again at the transactions already saved, with the current rules and lookup list: ATM withdrawals, fines,
// bank fees, card payments and refunds that were filed as Uncategorized or Income, and merchants whose category
// the lookup now knows better. A row that is still Uncategorized may also be sent to the model. Never touches a
// category the user chose. Runs once per account and version; returns how many rows changed. Never throws.
export function recategorizeOldRows(): Promise<number> {
  running ??= run()
    .catch((error: unknown) => {
      devLog(`[recategorize] failed: ${String(error)}`);
      return 0;
    })
    .finally(() => {
      running = null;
    });
  return running;
}

async function run(): Promise<number> {
  const userId = getCurrentUserId();
  if (!userId || Platform.OS !== 'android') return 0;
  if ((await AsyncStorage.getItem(flagKey(userId))) === 'done') return 0;

  const rows = await listRecategorizeCandidates(RUN_LIMIT);
  let changed = 0;
  let unreadable = false;

  for (const row of rows) {
    let raw: string | null;
    try {
      raw = await readRaw(row.smsId);
    } catch {
      unreadable = true; // no permission or no inbox: try again next time
      break;
    }
    if (raw === null) continue; // the message was deleted: nothing to read the wording from

    const txn: ParsedTxn = { ...row, raw };
    // A row that already has a category only gets an answer that needs no model; an Uncategorized one may ask it.
    const result = row.category === 'Uncategorized' ? await categorize(txn) : await categorizeLocally(txn);
    if (!result || result.retry || result.category === row.category) continue;
    if (await saveRecategorized(row.id, row.category, result)) {
      changed += 1;
      devLog(`[recategorize] ${row.category} -> ${result.category}`);
    }
  }

  if (!unreadable) await AsyncStorage.setItem(flagKey(userId), 'done');
  if (changed > 0) emitTransactionsChanged();
  devLog(`[recategorize] ${rows.length} rows looked at, ${changed} changed`);
  return changed;
}
