import { processSms } from './processSms';
import { readInbox } from './smsReader';
import { emitTransactionsChanged, saveTransaction } from '@/features/transactions/transactionsRepo';
import { saveIfMissed } from '@/features/transactions/unparsedRepo';

const BATCH_SIZE = 10;

export type ImportResult = { scanned: number; saved: number; skipped: number; unparsed: number };

export async function importHistory(limit: number): Promise<ImportResult> {
  const messages = await readInbox({ limit });
  const result: ImportResult = { scanned: messages.length, saved: 0, skipped: 0, unparsed: 0 };

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
