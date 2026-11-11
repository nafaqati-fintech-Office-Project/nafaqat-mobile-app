import { describe, expect, it } from 'vitest';

import type { TransactionItem } from '@/features/transactions/transactionsApi';

import { hasLikelyDuplicate } from './duplicate';

const row = (patch: Partial<TransactionItem>): TransactionItem => ({
  id: '1',
  merchant: 'Panda',
  category: 'Groceries',
  type: 'DEBIT',
  amount: '42.50',
  currency: 'SAR',
  date: new Date(2026, 9, 1, 18, 30),
  manual: false,
  ...patch,
});

const expense = { amount: '42.5', currency: 'SAR', day: new Date(2026, 9, 1) };

describe('hasLikelyDuplicate', () => {
  it('matches the same amount, currency and day', () => {
    expect(hasLikelyDuplicate([row({})], expense)).toBe(true);
  });

  it('ignores another day, amount, currency or an income row', () => {
    expect(hasLikelyDuplicate([row({ date: new Date(2026, 9, 2) })], expense)).toBe(false);
    expect(hasLikelyDuplicate([row({ amount: '42.60' })], expense)).toBe(false);
    expect(hasLikelyDuplicate([row({ currency: 'AED' })], expense)).toBe(false);
    expect(hasLikelyDuplicate([row({ type: 'CREDIT' })], expense)).toBe(false);
  });
});
