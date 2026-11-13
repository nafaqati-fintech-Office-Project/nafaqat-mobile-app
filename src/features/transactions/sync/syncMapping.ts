import { pickableCategories } from '../categoryDisplay';
import { smsFingerprint } from '@/features/sms/importClaim';
import type { ParsedTxn } from '@/features/sms/parser/types';

// The currencies the transaction service accepts (its Currency enum). Others stay on the phone only.
export const SERVER_CURRENCIES = ['PKR', 'AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR'];

const UNCATEGORIZED = 'UNCATEGORIZED';

// A stored transaction as the sync reads it.
export type SyncRow = {
  id: number;
  smsId: string;
  dedupeKey: string;
  bank: string;
  type: ParsedTxn['type'];
  amount: string;
  currency: string;
  merchant: string | null;
  cardLast4: string | null;
  date: number;
  txnDate: number | null;
  category: string;
};

// Body of POST /api/transactions (CreateTransactionRequest; unknown properties are rejected).
export type CreateTransactionBody = {
  amount: number;
  currency: string;
  type: ParsedTxn['type'];
  merchant?: string;
  description: string;
  transactionDate: string;
  externalTransactionId: string;
  category: string;
  // Which initial-import message this came from; the server requires it for SMS older than about a month.
  importClaim: string;
};

// The server's category for an app category. The user can only pick server categories, so those pass
// through. The app's own labels map to the closest server one: Income -> Other Income; Transfers and
// Person (a person's name is a transfer) -> Transfers; anything unknown -> UNCATEGORIZED. A category of
// the wrong kind for the type (the server refuses those) also becomes UNCATEGORIZED.
export function serverCategory(category: string, type: ParsedTxn['type']): string {
  const allowed = pickableCategories(type);
  if (allowed.includes(category)) return category;
  if (type === 'CREDIT' && category === 'Income') return 'Other Income';
  if (category === 'Transfers' || category === 'Person') return 'Transfers';
  // Set by the app only: money between the person's own accounts (either direction), and refunds (a credit).
  if (category === 'Internal Transfers') return category;
  if (type === 'CREDIT' && category === 'Refunds') return category;
  return UNCATEGORIZED;
}

// Same SMS, same id on every attempt, so the server's duplicate check (409) stops a second copy.
export const externalId = (row: Pick<SyncRow, 'dedupeKey'>): string => `sms:${row.dedupeKey}`;

// Never the SMS text: only the bank and the card's last digits, which the app already shows.
export function description(row: Pick<SyncRow, 'bank' | 'cardLast4'>): string {
  return row.cardLast4 ? `${row.bank} · card ****${row.cardLast4}` : row.bank;
}

// null when the row cannot be sent (unsupported currency or an amount that is not a positive number).
export function toCreateBody(row: SyncRow): CreateTransactionBody | null {
  const amount = Number(row.amount);
  if (!SERVER_CURRENCIES.includes(row.currency) || !Number.isFinite(amount) || amount <= 0) return null;
  const merchant = row.merchant?.trim();
  return {
    amount,
    currency: row.currency,
    type: row.type,
    ...(merchant ? { merchant: merchant.slice(0, 255) } : {}),
    description: description(row),
    // The date printed in the SMS when the bank gave one, else when the SMS arrived.
    transactionDate: new Date(row.txnDate ?? row.date).toISOString(),
    externalTransactionId: externalId(row),
    category: serverCategory(row.category, row.type),
    importClaim: smsFingerprint(row.smsId, row.date),
  };
}
