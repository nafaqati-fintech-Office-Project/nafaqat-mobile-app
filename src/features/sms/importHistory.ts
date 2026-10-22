import { processSms } from './processSms';
import { readInbox } from './smsReader';
import { saveTransaction } from '@/features/transactions/transactionsRepo';

const BATCH_SIZE = 10;

export type ImportResult = { scanned: number; saved: number; skipped: number };

export async function importHistory(limit: number): Promise<ImportResult> {
  const messages = await readInbox({ limit });
  const result: ImportResult = { scanned: messages.length, saved: 0, skipped: 0 };

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const processed = await Promise.all(messages.slice(i, i + BATCH_SIZE).map(processSms));
    for (const item of processed) {
      if (!item) result.skipped += 1;
      else if (await saveTransaction(item)) result.saved += 1;
    }
  }
  return result;
}
