import { categorizeMerchant, categorizeRedacted, type Categorized } from './categorize';
import { devLog } from '@/utils/devLog';
import {
  emitTransactionsChanged,
  listPendingPredictions,
  saveRetryResult,
  type PendingPrediction,
} from '@/features/transactions/transactionsRepo';

// The server refused this input this many times: leave the row Uncategorized for good.
export const MAX_ATTEMPTS = 5;
// Rows looked at per run, and model questions asked at once.
const RUN_LIMIT = 500;
const BATCH_SIZE = 5;

let running: Promise<number> | null = null;

// Asks the model again for transactions saved while it was unreachable. Returns how many rows got
// a final answer. A call made while a run is in progress joins that run. Never throws.
export function retryPendingPredictions(): Promise<number> {
  running ??= run()
    .catch((error: unknown) => {
      devLog(`[retry] failed: ${String(error)}`);
      return 0;
    })
    .finally(() => {
      running = null;
    });
  return running;
}

// Rows with the same merchant (or the same redacted text) get one model question between them.
function groupKey(row: PendingPrediction): string | null {
  if (row.retryText) return `text:${row.retryText}`;
  const merchant = row.merchant?.trim();
  return merchant ? `merchant:${merchant}` : null;
}

function ask(row: PendingPrediction): Promise<Categorized> {
  return row.retryText ? categorizeRedacted(row.retryText) : categorizeMerchant(row.merchant!.trim());
}

async function run(): Promise<number> {
  const rows = await listPendingPredictions(MAX_ATTEMPTS, RUN_LIMIT);
  if (rows.length === 0) return 0;

  const groups = new Map<string, PendingPrediction[]>();
  let resolved = 0;
  for (const row of rows) {
    const key = groupKey(row);
    if (key === null) {
      // Nothing left to ask the model with.
      await saveRetryResult(row.id, { category: 'Uncategorized', source: 'fallback' });
      resolved += 1;
      continue;
    }
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  devLog(`[retry] ${rows.length} pending rows, ${groups.size} model questions`);

  const entries = [...groups.values()];
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map((group) => ask(group[0])));
    for (const [index, result] of results.entries()) {
      for (const row of batch[index]) await saveRetryResult(row.id, result);
      if (!result.retry) resolved += batch[index].length;
    }
    // The model is unreachable: stop here and try the rest on the next run.
    if (results.every((result) => result.retry === 'unavailable')) {
      devLog('[retry] model unavailable, stopping this run');
      break;
    }
  }

  devLog(`[retry] ${resolved} rows resolved`);
  if (resolved > 0) emitTransactionsChanged();
  return resolved;
}
