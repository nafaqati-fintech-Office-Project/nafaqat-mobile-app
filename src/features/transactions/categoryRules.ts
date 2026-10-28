import { getDb } from './db';
import { emitTransactionsChanged } from './transactionsRepo';
import { getCurrentUserId } from '@/auth/currentUser';
import type { ParsedTxn } from '@/features/sms/parser/types';

type TxnType = ParsedTxn['type'];

// Same merchant whatever the spacing or case the bank used.
export const merchantKey = (merchant: string): string => merchant.trim().replace(/\s+/g, ' ').toUpperCase();

// source "user": picked by hand on this row, nothing overwrites it. "rule": filled in from the user's
// rule for the merchant, so it follows when they change that rule.
const SET_OWN_CATEGORY = `UPDATE transactions
  SET category = ?, source = ?, confidence = NULL, needs_prediction = 0, retry_text = NULL
  WHERE id = ?`;

// The signed-in user's own category for this merchant, or null. Never throws (web has no database).
export async function findUserCategory(merchant: string, type: TxnType): Promise<string | null> {
  const userId = getCurrentUserId();
  if (!userId) return null;
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{ category: string }>(
      'SELECT category FROM category_rules WHERE user_id = ? AND merchant_key = ? AND type = ?',
      [userId, merchantKey(merchant), type],
    );
    return row?.category ?? null;
  } catch {
    return null;
  }
}

export type CategoryChange = { id: number; category: string; applyToMerchant: boolean };

// The user picked a category. The row is marked as theirs (no retry or rule overwrites it), the change is
// kept as feedback, and with applyToMerchant it becomes their rule for this merchant: the merchant's other
// rows of the same type change now (except ones the user set by hand) and future SMS follow it.
// Returns how many rows changed.
export async function changeCategory({ id, category, applyToMerchant }: CategoryChange): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ merchant: string | null; type: TxnType; category: string; source: string }>(
    'SELECT merchant, type, category, source FROM transactions WHERE id = ?',
    [id],
  );
  if (!row) return 0;
  const userId = getCurrentUserId();
  const now = Date.now();
  let changed = 0;

  await db.withTransactionAsync(async () => {
    await db.runAsync(SET_OWN_CATEGORY, [category, 'user', id]);
    changed += 1;
    if (row.category !== category) {
      await db.runAsync(
        `INSERT INTO category_feedback
          (user_id, transaction_id, merchant, type, from_category, from_source, to_category, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, id, row.merchant, row.type, row.category, row.source, category, now],
      );
    }
    if (!applyToMerchant || !row.merchant || !userId) return;

    const key = merchantKey(row.merchant);
    await db.runAsync(
      `INSERT INTO category_rules (user_id, merchant_key, type, category, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (user_id, merchant_key, type) DO UPDATE SET category = excluded.category, updated_at = excluded.updated_at`,
      [userId, key, row.type, category, now],
    );
    const others = await db.getAllAsync<{ id: number; merchant: string }>(
      `SELECT id, merchant FROM transactions
       WHERE type = ? AND source <> 'user' AND id <> ? AND merchant IS NOT NULL`,
      [row.type, id],
    );
    for (const other of others) {
      if (merchantKey(other.merchant) !== key) continue;
      await db.runAsync(SET_OWN_CATEGORY, [category, 'rule', other.id]);
      changed += 1;
    }
  });

  emitTransactionsChanged();
  return changed;
}
