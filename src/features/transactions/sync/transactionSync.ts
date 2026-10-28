import { isAxiosError } from 'axios';

import { createTransaction, findByExternalId, updateCategory } from './syncApi';
import { serverCategory, toCreateBody } from './syncMapping';
import { listPendingSync, markCreated, markRefused, markSynced, type PendingSync } from './syncRepo';
import { devLog } from '@/utils/devLog';

// The server refused a row this many times (bad data): stop sending it so it cannot block the rest.
export const MAX_SYNC_ATTEMPTS = 3;
// Rows per pass; a pass that is full is followed by another.
const RUN_LIMIT = 200;
// One request at a time with this pause: about 5 a second, under the gateway's 10 a second per user.
const PAUSE_MS = 200;

type Outcome = 'synced' | 'refused' | 'stop';

let running: Promise<number> | null = null;
let again = false;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const statusOf = (error: unknown) => (isAxiosError(error) ? error.response?.status : undefined);

// Sends new transactions and changed categories to the transaction service. A call during a run asks
// for one more pass when it ends, so nothing saved meanwhile waits for the next trigger. Returns how
// many rows were synced. Never throws.
export function syncTransactions(): Promise<number> {
  if (running) {
    again = true;
    return running;
  }
  running = loop()
    .catch((error: unknown) => {
      devLog(`[sync] failed: ${String(error)}`);
      return 0;
    })
    .finally(() => {
      running = null;
    });
  return running;
}

async function loop(): Promise<number> {
  let total = 0;
  for (;;) {
    again = false;
    const { synced, stopped, full } = await pass();
    total += synced;
    if (stopped || (!again && !full)) return total;
  }
}

async function pass(): Promise<{ synced: number; stopped: boolean; full: boolean }> {
  const rows = await listPendingSync(MAX_SYNC_ATTEMPTS, RUN_LIMIT);
  let synced = 0;
  for (const [index, row] of rows.entries()) {
    if (index > 0) await wait(PAUSE_MS);
    const outcome = await syncRow(row);
    if (outcome === 'stop') {
      devLog(`[sync] server unavailable, stopping after ${synced} rows`);
      return { synced, stopped: true, full: false };
    }
    if (outcome === 'synced') synced += 1;
  }
  if (rows.length > 0) devLog(`[sync] ${synced} of ${rows.length} rows synced`);
  return { synced, stopped: false, full: rows.length === RUN_LIMIT };
}

async function syncRow(row: PendingSync): Promise<Outcome> {
  try {
    if (row.serverId) {
      await updateCategory(row.serverId, serverCategory(row.category, row.type));
      await markSynced(row.id, row.serverId, row.category);
      return 'synced';
    }
    return await create(row);
  } catch (error) {
    const status = statusOf(error);
    // No reply, an expired session, rate limiting or a server-side failure: try the rest later.
    if (status === undefined || status === 401 || status === 408 || status === 429 || status >= 500) return 'stop';
    devLog(`[sync] row ${row.id} refused: HTTP ${status}`);
    await markRefused(row.id);
    return 'refused';
  }
}

async function create(row: PendingSync): Promise<Outcome> {
  const body = toCreateBody(row);
  if (!body) {
    await markRefused(row.id);
    return 'refused';
  }
  try {
    await markSynced(row.id, await createTransaction(body), row.category);
    return 'synced';
  } catch (error) {
    if (statusOf(error) !== 409) throw error;
  }
  // Created before, but the reply never arrived. Find that copy and bring its category up to date.
  const serverId = await findByExternalId(body.externalTransactionId);
  await markCreated(row.id, serverId);
  await updateCategory(serverId, body.category);
  await markSynced(row.id, serverId, row.category);
  return 'synced';
}
