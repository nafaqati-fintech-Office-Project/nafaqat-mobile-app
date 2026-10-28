import { categoryFromCode } from './categoryDisplay';
import { api } from '@/api/client';
import { arr, decimal, num, obj, str } from '@/api/parse';

export type TransactionFilter = 'all' | 'expenses' | 'income';

// A transaction as the list screen shows it. category uses the app's names (see categoryDisplay).
export type TransactionItem = {
  id: string;
  merchant: string | null;
  category: string;
  type: 'DEBIT' | 'CREDIT';
  amount: string;
  currency: string;
  date: Date;
};

export type TransactionPage = { items: TransactionItem[]; page: number; hasMore: boolean };

export type TransactionQuery = { filter: TransactionFilter; search: string; page: number; size: number };

const TYPES: Record<TransactionFilter, 'DEBIT' | 'CREDIT' | undefined> = {
  all: undefined,
  expenses: 'DEBIT',
  income: 'CREDIT',
};

// The server's search accepts at most 100 characters.
const MAX_SEARCH = 100;

const optionalText = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);

function parseType(value: unknown): TransactionItem['type'] {
  if (value !== 'DEBIT' && value !== 'CREDIT') throw new Error('Invalid transaction type in response');
  return value;
}

function parseDate(value: unknown): Date {
  const date = new Date(str(value));
  if (Number.isNaN(date.getTime())) throw new Error('Invalid date in response');
  return date;
}

export function parseTransaction(raw: unknown): TransactionItem {
  const body = obj(raw);
  return {
    id: str(body.id),
    merchant: optionalText(body.merchant) ?? optionalText(body.description),
    // The code identifies the category; the label is the fallback for a code the app does not know yet.
    category: categoryFromCode(body.categoryCode) ?? str(body.category),
    type: parseType(body.type),
    amount: decimal(body.amount),
    currency: str(body.currency),
    date: parseDate(body.transactionDate),
  };
}

export function parseTransactionPage(raw: unknown): TransactionPage {
  const body = obj(raw);
  const page = num(body.page);
  return {
    items: arr(body.content).map(parseTransaction),
    page,
    hasMore: page + 1 < num(body.totalPages),
  };
}

// Newest first. Only completed movements: pending and failed ones would read as money already spent.
export async function fetchTransactionPage({ filter, search, page, size }: TransactionQuery): Promise<TransactionPage> {
  const q = search.trim().slice(0, MAX_SEARCH);
  const { data } = await api.get<unknown>('/api/transactions', {
    params: {
      type: TYPES[filter],
      q: q || undefined,
      status: 'COMPLETED',
      sort: 'transactionDate,desc',
      page,
      size,
    },
  });
  return parseTransactionPage(data);
}
