import { getDb } from './db';
import type { ParsedTxn } from '@/features/sms/parser/types';
import type { Categorized } from '@/features/categorizer/categorize';
import type { ProcessedSms } from '@/features/sms/processSms';

export type StoredTransaction = {
  id: number;
  type: ParsedTxn['type'];
  amount: string;
  currency: string;
  bank: string;
  merchant: string | null;
  cardLast4: string | null;
  balance: string | null;
  date: number;
  txnDate: number | null;
  category: string;
  source: string;
  confidence: number | null;
};

type Row = {
  id: number;
  type: ParsedTxn['type'];
  amount: string;
  currency: string;
  bank: string;
  merchant: string | null;
  card_last4: string | null;
  balance: string | null;
  date: number;
  txn_date: number | null;
  category: string;
  source: string;
  confidence: number | null;
};

export type PendingPrediction = { id: number; merchant: string | null; retryText: string | null };

type Listener = () => void;

const listeners = new Set<Listener>();

// Fires after rows change outside a screen's own load (a background re-categorization).
export function onTransactionsChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitTransactionsChanged(): void {
  listeners.forEach((listener) => listener());
}

// Never the hidden retry columns: those stay on the device.
const COLUMNS =
  'id, type, amount, currency, bank, merchant, card_last4, balance, date, txn_date, category, source, confidence';

const toStored = ({ card_last4, txn_date, ...row }: Row): StoredTransaction => ({
  ...row,
  cardLast4: card_last4,
  txnDate: txn_date,
});

export const transactionKey = (txn: ParsedTxn): string =>
  [txn.date, txn.type, txn.amount, txn.currency, txn.cardLast4 ?? ''].join('|');

export async function saveTransaction(processed: ProcessedSms): Promise<boolean> {
  const { txn, category, source, confidence, predictionId, retry, retryText } = processed;
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT OR IGNORE INTO transactions
      (dedupe_key, sms_id, bank, type, amount, currency, merchant, card_last4, balance, date, txn_date, category, source, confidence,
       needs_prediction, prediction_attempts, retry_text, prediction_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      transactionKey(txn),
      txn.smsId,
      txn.bank,
      txn.type,
      txn.amount,
      txn.currency,
      txn.merchant,
      txn.cardLast4,
      txn.balance ?? null,
      txn.date,
      txn.txnDate ?? null,
      category,
      source,
      confidence ?? null,
      retry ? 1 : 0,
      retry === 'rejected' ? 1 : 0,
      retry ? (retryText ?? null) : null,
      predictionId ?? null,
    ],
  );
  if (result.changes > 0) return true;

  // Already saved: a re-import fills in the category of a row that is still Uncategorized, and leaves any
  // other category (including one the user picked) alone. The sync then sends the change to the server.
  if (category === 'Uncategorized') return false;
  const upgraded = await db.runAsync(
    `UPDATE transactions SET category = ?, source = ?, confidence = ?, prediction_id = ?,
       needs_prediction = 0, retry_text = NULL
     WHERE dedupe_key = ? AND category = 'Uncategorized'`,
    [category, source, confidence ?? null, predictionId ?? null, transactionKey(txn)],
  );
  return upgraded.changes > 0;
}

// Rows still waiting for the model, newest first, skipping those the server refused maxAttempts times.
export async function listPendingPredictions(maxAttempts: number, limit: number): Promise<PendingPrediction[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: number; merchant: string | null; retry_text: string | null }>(
    `SELECT id, merchant, retry_text FROM transactions
     WHERE needs_prediction = 1 AND prediction_attempts < ?
     ORDER BY date DESC LIMIT ?`,
    [maxAttempts, limit],
  );
  return rows.map(({ retry_text, ...row }) => ({ ...row, retryText: retry_text }));
}

// Stores the outcome of a retry. A new failure keeps the row pending; only a refusal counts as an attempt.
// Only a row still pending is touched, so a category the user picked meanwhile is never overwritten.
export async function saveRetryResult(id: number, result: Categorized): Promise<void> {
  const db = await getDb();
  if (result.retry) {
    await db.runAsync(
      `UPDATE transactions
       SET merchant = COALESCE(?, merchant), retry_text = ?, prediction_attempts = prediction_attempts + ?
       WHERE id = ? AND needs_prediction = 1`,
      [result.merchant ?? null, result.retryText ?? null, result.retry === 'rejected' ? 1 : 0, id],
    );
    return;
  }
  await db.runAsync(
    `UPDATE transactions
     SET category = ?, source = ?, confidence = ?, prediction_id = ?, merchant = COALESCE(?, merchant),
         needs_prediction = 0, retry_text = NULL
     WHERE id = ? AND needs_prediction = 1`,
    [result.category, result.source, result.confidence ?? null, result.predictionId ?? null, result.merchant ?? null, id],
  );
}

// A saved transaction as it is looked at again when the categories improve.
export type RecategorizeCandidate = {
  id: number;
  smsId: string;
  bank: string;
  type: ParsedTxn['type'];
  amount: string;
  currency: string;
  merchant: string | null;
  cardLast4: string | null;
  balance: string | null;
  date: number;
  txnDate: number | null;
  category: string;
};

// Rows worth a second look, newest first: still Uncategorized, filed as plain Income (it may be a refund or a
// card payment), or answered by the lookup list (which has changed). Never a row the user set by hand, nor one
// that follows their own merchant rule.
export async function listRecategorizeCandidates(limit: number): Promise<RecategorizeCandidate[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: number;
    sms_id: string;
    bank: string;
    type: ParsedTxn['type'];
    amount: string;
    currency: string;
    merchant: string | null;
    card_last4: string | null;
    balance: string | null;
    date: number;
    txn_date: number | null;
    category: string;
  }>(
    `SELECT id, sms_id, bank, type, amount, currency, merchant, card_last4, balance, date, txn_date, category
     FROM transactions
     WHERE source NOT IN ('user', 'rule') AND (category IN ('Uncategorized', 'Income') OR source = 'lookup')
     ORDER BY date DESC LIMIT ?`,
    [limit],
  );
  return rows.map(({ sms_id, card_last4, txn_date, ...row }) => ({
    ...row,
    smsId: sms_id,
    cardLast4: card_last4,
    txnDate: txn_date,
  }));
}

// Stores a better category for a row. Only if the row still has the category it was read with and is not the
// user's own choice, so a change made meanwhile is never overwritten. The sync then sends it to the server.
export async function saveRecategorized(id: number, from: string, result: Categorized): Promise<boolean> {
  const db = await getDb();
  const changed = await db.runAsync(
    `UPDATE transactions
     SET category = ?, source = ?, confidence = ?, prediction_id = ?, needs_prediction = 0, retry_text = NULL,
         sync_attempts = 0
     WHERE id = ? AND category = ? AND source NOT IN ('user')`,
    [result.category, result.source, result.confidence ?? null, result.predictionId ?? null, id, from],
  );
  return changed.changes > 0;
}

export async function listTransactions(limit = 200): Promise<StoredTransaction[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(`SELECT ${COLUMNS} FROM transactions ORDER BY date DESC LIMIT ?`, [limit]);
  return rows.map(toStored);
}

// Spending on this phone between two instants (from inclusive, to exclusive) in one currency, per
// category. Money moved between own accounts is not spending. Totals are for thresholds, not display.
export async function spentByCategory(from: number, to: number, currency: string): Promise<Map<string, number>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ category: string; total: number }>(
    `SELECT category, SUM(CAST(amount AS REAL)) AS total FROM transactions
     WHERE type = 'DEBIT' AND currency = ? AND category NOT IN ('Transfers', 'Internal Transfers')
       AND COALESCE(txn_date, date) >= ? AND COALESCE(txn_date, date) < ?
     GROUP BY category`,
    [currency, from, to],
  );
  return new Map(rows.map((r) => [r.category, r.total]));
}

// The phone's copy of a transaction the service holds, found by the duplicate key the sync sent.
export async function getTransactionByDedupeKey(
  dedupeKey: string,
): Promise<(StoredTransaction & { smsId: string }) | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row & { sms_id: string }>(
    `SELECT ${COLUMNS}, sms_id FROM transactions WHERE dedupe_key = ?`,
    [dedupeKey],
  );
  return row ? { ...toStored(row), smsId: row.sms_id } : null;
}

export async function getTransaction(id: number): Promise<StoredTransaction | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>(`SELECT ${COLUMNS} FROM transactions WHERE id = ?`, [id]);
  return row ? toStored(row) : null;
}
