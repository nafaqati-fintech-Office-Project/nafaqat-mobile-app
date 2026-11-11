import { categoryFromCode, codeForCategory } from './categoryDisplay';
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
  // Entered by hand in the app (a cash expense); only these can be deleted.
  manual: boolean;
  // Shown on the details card. Optional: rows made on the phone (mock) may not have them.
  description?: string | null;
  status?: string | null;
  // "sms:" + the phone's duplicate key for a transaction read from an SMS; null for cash expenses.
  externalId?: string | null;
};

// A cash expense entered by hand. category is the service's code; transactionDate an ISO instant.
export type NewCashExpense = {
  amount: string;
  currency: string;
  merchant: string | null;
  description: string;
  category: string;
  transactionDate: string;
};

export type TransactionPage = { items: TransactionItem[]; page: number; hasMore: boolean };

// Narrows the list further, from a drill-down link: one category (the app's name) and/or calendar days (yyyy-MM-dd,
// inclusive, on the phone's calendar).
export type TransactionScope = { category?: string; from?: string; to?: string };

export type TransactionQuery = { filter: TransactionFilter; search: string; page: number; size: number; scope?: TransactionScope };

// The phone's time zone, so "1 November" on the server is the same day the person sees.
const phoneTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
};

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
    manual: body.source === 'MANUAL',
    description: optionalText(body.description),
    status: optionalText(body.status),
    externalId: optionalText(body.externalTransactionId),
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

// One transaction by the transaction service's id (a notification's referenceId).
export async function fetchTransaction(id: string): Promise<TransactionItem> {
  const { data } = await api.get<unknown>(`/api/transactions/${encodeURIComponent(id)}`);
  return parseTransaction(data);
}

// Newest first. Only completed movements: pending and failed ones would read as money already spent.
export async function fetchTransactionPage({ filter, search, page, size, scope }: TransactionQuery): Promise<TransactionPage> {
  const q = search.trim().slice(0, MAX_SEARCH);
  const dated = Boolean(scope?.from || scope?.to);
  const { data } = await api.get<unknown>('/api/transactions', {
    params: {
      type: TYPES[filter],
      q: q || undefined,
      category: scope?.category ? (codeForCategory(scope.category) ?? undefined) : undefined,
      startDate: scope?.from || undefined,
      endDate: scope?.to || undefined,
      timeZone: dated ? phoneTimeZone() : undefined,
      status: 'COMPLETED',
      sort: 'transactionDate,desc',
      page,
      size,
    },
  });
  return parseTransactionPage(data);
}

// No externalTransactionId: the service then marks it MANUAL, which is what makes it deletable later.
export async function createCashExpense({ merchant, ...rest }: NewCashExpense): Promise<TransactionItem> {
  const { data } = await api.post<unknown>('/api/transactions', {
    ...rest,
    type: 'DEBIT',
    ...(merchant ? { merchant } : {}),
  });
  return parseTransaction(data);
}

// A soft delete. The service refuses (409) anything not entered by hand.
export async function deleteTransaction(id: string): Promise<void> {
  await api.delete(`/api/transactions/${encodeURIComponent(id)}`);
}
