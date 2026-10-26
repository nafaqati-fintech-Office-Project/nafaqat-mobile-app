import { getDb } from './db';
import type { ParsedTxn } from '@/features/sms/parser/types';
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

export const transactionKey = (txn: ParsedTxn): string =>
  [txn.date, txn.type, txn.amount, txn.currency, txn.cardLast4 ?? ''].join('|');

export async function saveTransaction(processed: ProcessedSms): Promise<boolean> {
  const { txn, category, source, confidence } = processed;
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT OR IGNORE INTO transactions
      (dedupe_key, sms_id, bank, type, amount, currency, merchant, card_last4, balance, date, txn_date, category, source, confidence)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    ],
  );
  return result.changes > 0;
}

export async function listTransactions(limit = 200): Promise<StoredTransaction[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM transactions ORDER BY date DESC LIMIT ?',
    [limit],
  );
  return rows.map(({ card_last4, txn_date, ...row }) => ({
    ...row,
    cardLast4: card_last4,
    txnDate: txn_date,
  }));
}
