import { sameDebit } from './wallet';
import { getDb } from '@/features/transactions/db';

type Row = { amount: string; currency: string; card_last4: string | null; date: number };

export type DebitProbe = { amount: number; currency?: string; cardLast4: string | null; at: number };

/**
 * Is there already a saved debit that is the same purchase? `wallet: true` looks only at transactions that came from
 * Apple Wallet, `false` only at those that came from a bank message (so a Wallet payment is not matched with itself).
 */
export async function hasSavedDebitNear(probe: DebitProbe, windowMs: number, wallet: boolean): Promise<boolean> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT amount, currency, card_last4, date FROM transactions
     WHERE type = 'DEBIT' AND date BETWEEN ? AND ? AND sms_id ${wallet ? 'LIKE' : 'NOT LIKE'} 'wallet:%'`,
    [probe.at - windowMs, probe.at + windowMs],
  );
  return rows.some((row) =>
    sameDebit(
      probe,
      { amount: Number.parseFloat(row.amount), currency: row.currency, cardLast4: row.card_last4, at: row.date },
      windowMs,
    ),
  );
}
