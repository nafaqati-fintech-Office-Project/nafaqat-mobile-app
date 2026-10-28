import { mockTransactions } from './mock';
import { fetchTransactionPage, type TransactionPage, type TransactionQuery } from './transactionsApi';
import { AUTH_BYPASS } from '@/config/flags';

const MOCK_DELAY_MS = 400;

async function getMockPage({ filter, search }: TransactionQuery): Promise<TransactionPage> {
  await new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
  const needle = search.trim().toLowerCase();
  const items = mockTransactions.filter(
    (row) =>
      (filter === 'all' || (filter === 'income') === (row.type === 'CREDIT')) &&
      (!needle || (row.merchant ?? '').toLowerCase().includes(needle)),
  );
  return { items, page: 0, hasMore: false };
}

export function getTransactionPage(query: TransactionQuery): Promise<TransactionPage> {
  // The bypass session has no token, so the real endpoint would answer 401.
  return AUTH_BYPASS ? getMockPage(query) : fetchTransactionPage(query);
}
