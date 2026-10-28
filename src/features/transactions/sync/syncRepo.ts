import { getDb } from '../db';
import { SERVER_CURRENCIES, type SyncRow } from './syncMapping';

export type PendingSync = SyncRow & { serverId: string | null };

type Row = {
  id: number;
  dedupe_key: string;
  bank: string;
  type: SyncRow['type'];
  amount: string;
  currency: string;
  merchant: string | null;
  card_last4: string | null;
  date: number;
  txn_date: number | null;
  category: string;
  server_id: string | null;
};

// Rows the server does not have yet, or whose category changed since it last accepted one. Rows the
// server refused maxAttempts times, and currencies it does not accept, are left out. Oldest first, so
// a long first sync fills the server in date order.
export async function listPendingSync(maxAttempts: number, limit: number): Promise<PendingSync[]> {
  const db = await getDb();
  const currencies = SERVER_CURRENCIES.map(() => '?').join(', ');
  const rows = await db.getAllAsync<Row>(
    `SELECT id, dedupe_key, bank, type, amount, currency, merchant, card_last4, date, txn_date, category, server_id
     FROM transactions
     WHERE (server_id IS NULL OR synced_category IS NOT category)
       AND sync_attempts < ? AND currency IN (${currencies})
     ORDER BY date ASC LIMIT ?`,
    [maxAttempts, ...SERVER_CURRENCIES, limit],
  );
  return rows.map(({ dedupe_key, card_last4, txn_date, server_id, ...row }) => ({
    ...row,
    dedupeKey: dedupe_key,
    cardLast4: card_last4,
    txnDate: txn_date,
    serverId: server_id,
  }));
}

// The server holds this row with this category. A refusal count from earlier attempts is cleared.
export async function markSynced(id: number, serverId: string, category: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE transactions SET server_id = ?, synced_category = ?, sync_attempts = 0 WHERE id = ?', [
    serverId,
    category,
    id,
  ]);
}

// Created on the server, but its category still has to be sent (kept so the next run only PATCHes).
export async function markCreated(id: number, serverId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE transactions SET server_id = ? WHERE id = ?', [serverId, id]);
}

// The server refused this row (a 4xx other than 401/408/409/429).
export async function markRefused(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE transactions SET sync_attempts = sync_attempts + 1 WHERE id = ?', [id]);
}
