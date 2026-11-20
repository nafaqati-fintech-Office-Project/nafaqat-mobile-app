import { isAxiosError } from 'axios';

import { categoryFromCode, codeForCategory } from './categoryDisplay';
import { updateCategory } from './sync/syncApi';
import { mockTransactions } from './mock';
import {
  createCashExpense,
  deleteTransaction,
  fetchTransaction,
  fetchCards,
  fetchTransactionPage,
  cardFromDescription,
  type CardSummary,
  type NewCashExpense,
  type TransactionItem,
  type TransactionPage,
  type TransactionQuery,
} from './transactionsApi';
import { AUTH_BYPASS } from '@/config/flags';
import { refreshDashboards } from '@/features/dashboard/dashboardStore';

const MOCK_DELAY_MS = 400;
const wait = () => new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
// The bypass session keeps added and deleted rows in memory.
let mock: TransactionItem[] = [...mockTransactions];

const dayOf = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

async function getMockPage({ filter, search, scope }: TransactionQuery): Promise<TransactionPage> {
  await wait();
  const needle = search.trim().toLowerCase();
  const inScope = (row: TransactionItem) =>
    (!scope?.category || row.category === scope.category) &&
    (!scope?.from || dayOf(row.date) >= scope.from) &&
    (!scope?.to || dayOf(row.date) <= scope.to) &&
    (!scope?.card || (row.card ?? cardFromDescription(row.description)) === scope.card);
  const items = mock
    .filter(
      (row) =>
        (filter === 'all' || (filter === 'income') === (row.type === 'CREDIT')) &&
        (!needle || (row.merchant ?? '').toLowerCase().includes(needle)) &&
        inScope(row),
    )
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  return { items, page: 0, hasMore: false };
}

// The bypass session lists the cards of its mock rows.
export async function getCards(): Promise<CardSummary[]> {
  if (!AUTH_BYPASS) return fetchCards();
  const counts = new Map<string, CardSummary>();
  for (const row of mock) {
    const card = row.card ?? cardFromDescription(row.description);
    if (!card) continue;
    const bank = row.description?.includes(' · ') ? row.description.split(' · ')[0] : null;
    const entry = counts.get(card) ?? { card, bank, count: 0 };
    entry.count += 1;
    counts.set(card, entry);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}

export function getTransactionPage(query: TransactionQuery): Promise<TransactionPage> {
  // The bypass session has no token, so the real endpoint would answer 401.
  return AUTH_BYPASS ? getMockPage(query) : fetchTransactionPage(query);
}

export async function getTransaction(id: string): Promise<TransactionItem> {
  if (!AUTH_BYPASS) return fetchTransaction(id);
  const row = mock.find((item) => item.id === id);
  if (!row) throw new Error('Transaction not found');
  return row;
}

export async function addCashExpense(body: NewCashExpense): Promise<TransactionItem> {
  if (!AUTH_BYPASS) {
    const added = await createCashExpense(body);
    void refreshDashboards();
    return added;
  }
  await wait();
  const added: TransactionItem = {
    id: `m${Date.now()}`,
    merchant: body.merchant ?? body.description,
    category: categoryFromCode(body.category) ?? 'Uncategorized',
    type: 'DEBIT',
    amount: body.amount,
    currency: body.currency,
    date: new Date(body.transactionDate),
    manual: true,
  };
  mock = [added, ...mock];
  return added;
}

export async function removeTransaction(id: string): Promise<void> {
  if (!AUTH_BYPASS) {
    await deleteTransaction(id);
    void refreshDashboards();
    return;
  }
  await wait();
  mock = mock.filter((row) => row.id !== id);
}

// Changes the category of a transaction on the service (the bypass session changes the in-memory row).
export async function setTransactionCategory(id: string, category: string): Promise<void> {
  if (!AUTH_BYPASS) {
    const code = codeForCategory(category);
    if (!code) throw new Error('Category has no service code');
    await updateCategory(id, code);
    void refreshDashboards();
    return;
  }
  await wait();
  mock = mock.map((row) => (row.id === id ? { ...row, category } : row));
}

// gone: already deleted (on another device, for example), so the row can just go.
// notDeletable: the service only deletes transactions entered by hand.
export type DeleteProblem = 'gone' | 'notDeletable' | 'network' | 'unknown';

export function deleteProblem(error: unknown): DeleteProblem {
  if (!isAxiosError(error)) return 'unknown';
  const status = error.response?.status;
  if (status === undefined) return 'network';
  if (status === 404) return 'gone';
  if (status === 409) return 'notDeletable';
  return 'unknown';
}
