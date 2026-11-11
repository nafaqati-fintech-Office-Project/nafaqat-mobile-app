import type { TransactionItem } from '@/features/transactions/transactionsApi';

// An expense with the same amount, currency and day: the receipt may already be there (an SMS from the
// card payment, or a scan done twice). Only a hint; the user decides.
export function hasLikelyDuplicate(
  rows: TransactionItem[],
  expense: { amount: string; currency: string; day: Date },
): boolean {
  return rows.some(
    (row) =>
      row.type === 'DEBIT' &&
      row.currency === expense.currency &&
      Number(row.amount) === Number(expense.amount) &&
      row.date.getFullYear() === expense.day.getFullYear() &&
      row.date.getMonth() === expense.day.getMonth() &&
      row.date.getDate() === expense.day.getDate(),
  );
}
