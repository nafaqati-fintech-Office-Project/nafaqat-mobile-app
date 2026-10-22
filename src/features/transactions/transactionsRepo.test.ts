import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listTransactions, saveTransaction, transactionKey } from './transactionsRepo';
import type { ParsedTxn } from '@/features/sms/parser/types';

const db = { execAsync: vi.fn(), runAsync: vi.fn(), getAllAsync: vi.fn() };

vi.mock('expo-sqlite', () => ({ openDatabaseAsync: () => Promise.resolve(db) }));

const txn: ParsedTxn = {
  smsId: '9',
  bank: 'HBL',
  type: 'DEBIT',
  amount: '1250.00',
  currency: 'PKR',
  merchant: 'KFC LAHORE',
  cardLast4: '1234',
  date: 1000,
  raw: 'SECRET RAW BODY',
};
const processed = { txn, category: 'Food & Beverage', source: 'lookup' as const };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('transactionKey', () => {
  it('is stable and ignores the raw body and sms id', () => {
    expect(transactionKey(txn)).toBe(transactionKey({ ...txn, raw: 'other', smsId: '10' }));
    expect(transactionKey(txn)).toBe('1000|DEBIT|1250.00|PKR|1234');
  });
});

describe('saveTransaction', () => {
  it('returns true when a row was inserted and false for a duplicate', async () => {
    db.runAsync.mockResolvedValueOnce({ changes: 1 }).mockResolvedValueOnce({ changes: 0 });
    expect(await saveTransaction(processed)).toBe(true);
    expect(await saveTransaction(processed)).toBe(false);
  });

  it('never stores the raw SMS body', async () => {
    db.runAsync.mockResolvedValue({ changes: 1 });
    await saveTransaction(processed);
    expect(JSON.stringify(db.runAsync.mock.calls[0])).not.toContain('SECRET RAW BODY');
  });
});

describe('listTransactions', () => {
  it('maps rows to camelCase', async () => {
    db.getAllAsync.mockResolvedValue([
      { id: 1, type: 'DEBIT', amount: '5', currency: 'SAR', bank: 'SNB', merchant: null, card_last4: '7788', date: 1, category: 'Fuel', source: 'model', confidence: 0.9 },
    ]);
    expect(await listTransactions()).toEqual([
      { id: 1, type: 'DEBIT', amount: '5', currency: 'SAR', bank: 'SNB', merchant: null, cardLast4: '7788', date: 1, category: 'Fuel', source: 'model', confidence: 0.9 },
    ]);
  });
});
