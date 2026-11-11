import { BUDGET_CURRENCIES } from '@/features/budget/budgetForm';

// A receipt may be in a currency the app does not keep money in; the add form converts it.
const RECEIPT_CURRENCIES: readonly string[] = [...BUDGET_CURRENCIES, 'USD', 'EUR', 'GBP'];
export const isReceiptCurrency = (value: unknown): value is string =>
  typeof value === 'string' && RECEIPT_CURRENCIES.includes(value);

// What the server read from a receipt or bill. Every field but the amount may be missing.
export type ScannedReceipt = {
  amount: string;
  currency: string | null;
  merchant: string | null;
  // The day on the receipt, "YYYY-MM-DD".
  date: string | null;
  // One of the app's category names.
  category: string | null;
};

const AMOUNT = /^\d{1,9}(\.\d{1,3})?$/;
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

const text = (value: unknown, max: number): string | null =>
  typeof value === 'string' && value.trim() && value.trim().length <= max ? value.trim() : null;

// The server's answer as a receipt, or null when it found no usable total.
export function parseReceipt(body: unknown): ScannedReceipt | null {
  const receipt = (body as { receipt?: unknown } | null)?.receipt;
  if (typeof receipt !== 'object' || receipt === null) return null;
  const { amount, currency, merchant, date, category } = receipt as Record<string, unknown>;
  if (typeof amount !== 'string' || !AMOUNT.test(amount) || Number(amount) <= 0) return null;
  return {
    amount,
    currency: isReceiptCurrency(currency) ? currency : null,
    merchant: text(merchant, 60),
    date: receiptDay(date) ? (date as string) : null,
    category: text(category, 40),
  };
}

// "YYYY-MM-DD" as that day at local midnight; null when it is not a real day.
export function receiptDay(value: unknown): Date | null {
  const match = typeof value === 'string' ? DAY.exec(value) : null;
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
  const date = new Date(year, month, day);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day ? date : null;
}
