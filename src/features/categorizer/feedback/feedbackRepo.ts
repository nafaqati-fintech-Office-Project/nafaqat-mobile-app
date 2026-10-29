import { getDb } from '@/features/transactions/db';
import type { ParsedTxn } from '@/features/sms/parser/types';

export type PendingFeedback = {
  id: number;
  merchant: string | null;
  type: ParsedTxn['type'];
  fromCategory: string;
  fromSource: string;
  toCategory: string;
  predictionId: string | null;
};

type Row = {
  id: number;
  merchant: string | null;
  type: ParsedTxn['type'];
  from_category: string;
  from_source: string;
  to_category: string;
  prediction_id: string | null;
};

export const FEEDBACK_PENDING = 0;
export const FEEDBACK_SENT = 1;
// Kept on the device for good: not a model prediction, about a person, or refused by the server.
export const FEEDBACK_KEPT = 2;

// This user's changes not handled yet, oldest first. Another user's changes on the same phone wait for
// that user, since the server counts each correction for whoever is signed in.
export async function listPendingFeedback(userId: string, limit: number): Promise<PendingFeedback[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT id, merchant, type, from_category, from_source, to_category, prediction_id FROM category_feedback
     WHERE synced = ? AND user_id = ? ORDER BY id ASC LIMIT ?`,
    [FEEDBACK_PENDING, userId, limit],
  );
  return rows.map(({ from_category, from_source, to_category, prediction_id, ...row }) => ({
    ...row,
    fromCategory: from_category,
    fromSource: from_source,
    toCategory: to_category,
    predictionId: prediction_id,
  }));
}

export async function markFeedback(id: number, state: typeof FEEDBACK_SENT | typeof FEEDBACK_KEPT): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE category_feedback SET synced = ? WHERE id = ?', [state, id]);
}
