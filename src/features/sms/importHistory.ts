import { processSms } from './processSms';
import { smsFingerprint } from './importClaim';
import { isTransactional } from './parser/filter';
import { readInbox } from './smsReader';
import { AUTH_BYPASS } from '@/config/flags';
import { claimImport } from '@/features/billing/billingApi';
import { emitTransactionsChanged, saveTransaction } from '@/features/transactions/transactionsRepo';
import { saveIfMissed } from '@/features/transactions/unparsedRepo';

const BATCH_SIZE = 10;

// limited: messages the plan did not allow (the Free plan imports 50 in the initial import).
export type ImportResult = { scanned: number; saved: number; skipped: number; unparsed: number; limited: number };

export async function importHistory(limit: number): Promise<ImportResult> {
  let messages = await readInbox({ limit });
  let limited = 0;
  if (!AUTH_BYPASS) {
    // The server decides how many messages the initial import may process: newest first, only messages that look like
    // a money movement, and a repeat of the same message never uses the allowance twice.
    const eligible = messages.filter((m) => isTransactional(m.body));
    const { accepted, rejected } = await claimImport(eligible.map((m) => smsFingerprint(m.id, m.date)));
    const allowed = new Set(accepted);
    messages = eligible.filter((m) => allowed.has(smsFingerprint(m.id, m.date)));
    limited = rejected;
  }
  const result: ImportResult = { scanned: messages.length, saved: 0, skipped: 0, unparsed: 0, limited };

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    const processed = await Promise.all(batch.map(processSms));
    for (const [index, item] of processed.entries()) {
      if (!item) {
        result.skipped += 1;
        if (await saveIfMissed(batch[index]).catch(() => false)) result.unparsed += 1;
      } else if (await saveTransaction(item)) result.saved += 1;
    }
  }
  // Once for the whole import, not per row.
  if (result.saved > 0) emitTransactionsChanged();
  return result;
}
