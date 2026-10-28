import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchTransactionPage, parseTransaction, parseTransactionPage } from './transactionsApi';

const get = vi.hoisted(() => vi.fn());
vi.mock('@/api/client', () => ({ api: { get } }));

beforeEach(() => {
  get.mockReset();
});

const row = (overrides: Record<string, unknown> = {}) => ({
  id: '01a13571-0000-0000-0000-000000000001',
  amount: 28.5,
  currency: 'SAR',
  type: 'DEBIT',
  merchant: 'Starbucks',
  description: 'POS purchase',
  category: 'Food & Beverage',
  categoryCode: 'FOOD_AND_BEVERAGE',
  status: 'COMPLETED',
  source: 'EXTERNAL',
  externalTransactionId: 'sms|1',
  transactionDate: '2026-10-28T07:24:00Z',
  createdAt: '2026-10-28T07:25:00Z',
  updatedAt: '2026-10-28T07:25:00Z',
  ...overrides,
});

describe('parseTransaction', () => {
  it('maps the server fields the list shows', () => {
    expect(parseTransaction(row())).toEqual({
      id: '01a13571-0000-0000-0000-000000000001',
      merchant: 'Starbucks',
      category: 'Food & Beverage',
      type: 'DEBIT',
      amount: '28.5',
      currency: 'SAR',
      date: new Date('2026-10-28T07:24:00Z'),
    });
  });

  it('keeps a string amount as sent', () => {
    expect(parseTransaction(row({ amount: '320.0000' })).amount).toBe('320.0000');
  });

  it('uses the app name for the uncategorized label', () => {
    expect(parseTransaction(row({ category: 'UNCATEGORIZED', categoryCode: 'UNCATEGORIZED' })).category).toBe(
      'Uncategorized',
    );
  });

  it('falls back to the description, then to no merchant', () => {
    expect(parseTransaction(row({ merchant: undefined })).merchant).toBe('POS purchase');
    expect(parseTransaction(row({ merchant: '  ', description: null })).merchant).toBeNull();
  });

  it('rejects an unknown type or a bad date', () => {
    expect(() => parseTransaction(row({ type: 'REFUND' }))).toThrow();
    expect(() => parseTransaction(row({ transactionDate: 'yesterday' }))).toThrow();
  });
});

describe('parseTransactionPage', () => {
  it('reports whether more pages follow', () => {
    const body = { content: [row()], page: 0, size: 30, totalElements: 31, totalPages: 2 };
    expect(parseTransactionPage(body).hasMore).toBe(true);
    expect(parseTransactionPage({ ...body, page: 1 }).hasMore).toBe(false);
    expect(parseTransactionPage({ ...body, content: [], totalPages: 0 }).hasMore).toBe(false);
  });
});

describe('fetchTransactionPage', () => {
  const empty = { content: [], page: 0, size: 30, totalElements: 0, totalPages: 0 };

  it('asks for completed rows, newest first, with the type of the filter', async () => {
    get.mockResolvedValue({ data: empty });
    await fetchTransactionPage({ filter: 'expenses', search: '  star ', page: 2, size: 30 });
    expect(get).toHaveBeenCalledWith('/api/transactions', {
      params: { type: 'DEBIT', q: 'star', status: 'COMPLETED', sort: 'transactionDate,desc', page: 2, size: 30 },
    });
  });

  it('sends no type or search when they are not set', async () => {
    get.mockResolvedValue({ data: empty });
    await fetchTransactionPage({ filter: 'all', search: ' ', page: 0, size: 30 });
    expect(get.mock.calls[0][1].params).toMatchObject({ type: undefined, q: undefined });
  });
});
