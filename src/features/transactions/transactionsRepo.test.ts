import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listTransactions, saveTransaction, transactionKey } from './transactionsRepo';
import type { ParsedTxn } from '@/features/sms/parser/types';

const db = { execAsync: vi.fn(), runAsync: vi.fn(), getAllAsync: vi.fn(), getFirstAsync: vi.fn() };

vi.mock('expo-sqlite', () => ({ openDatabaseAsync: () => Promise.resolve(db) }));

const txn: ParsedTxn = {
  smsId: '9',
  bank: 'HBL',
  type: 'DEBIT',
  amount: '1250.00',
  currency: 'PKR',
  merchant: 'KFC LAHORE',
  cardLast4: '1234',
  balance: '9000.00',
  txnDate: 900,
  date: 1000,
  raw: 'SECRET RAW BODY',
};
const processed = { txn, category: 'Food & Beverage', source: 'lookup' as const };

beforeEach(() => {
  vi.clearAllMocks();
  db.getFirstAsync.mockResolvedValue({ user_version: 2 });
});

describe('getDb migrations', () => {
  it('adds the balance and txn_date columns once on an old database', async () => {
    vi.resetModules();
    db.getFirstAsync.mockResolvedValue({ user_version: 0 });
    const { getDb } = await import('./db');
    await getDb();
    const statements = db.execAsync.mock.calls.map(([sql]) => String(sql));
    expect(statements).toContain('ALTER TABLE transactions ADD COLUMN balance TEXT');
    expect(statements).toContain('ALTER TABLE transactions ADD COLUMN txn_date INTEGER');
    expect(statements).toContain('PRAGMA user_version = 2');
  });

  it('runs no migration when the database is already current', async () => {
    vi.resetModules();
    const { getDb } = await import('./db');
    await getDb();
    expect(db.execAsync.mock.calls.some(([sql]) => String(sql).includes('ALTER TABLE'))).toBe(false);
  });
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

  it('stores the balance and the transaction date from the SMS', async () => {
    db.runAsync.mockResolvedValue({ changes: 1 });
    await saveTransaction(processed);
    const params = db.runAsync.mock.calls[0][1] as unknown[];
    expect(params).toContain('9000.00');
    expect(params).toContain(900);
  });

  it('stores null when the parser found neither', async () => {
    db.runAsync.mockResolvedValue({ changes: 1 });
    const { balance, txnDate, ...bare } = txn;
    await saveTransaction({ ...processed, txn: bare });
    const params = db.runAsync.mock.calls[0][1] as unknown[];
    expect(params.filter((p) => p === null).length).toBeGreaterThanOrEqual(2);
  });
});

describe('listTransactions', () => {
  it('maps rows to camelCase', async () => {
    db.getAllAsync.mockResolvedValue([
      { id: 1, type: 'DEBIT', amount: '5', currency: 'SAR', bank: 'SNB', merchant: null, card_last4: '7788', balance: '40', date: 1, txn_date: 2, category: 'Fuel', source: 'model', confidence: 0.9 },
    ]);
    expect(await listTransactions()).toEqual([
      { id: 1, type: 'DEBIT', amount: '5', currency: 'SAR', bank: 'SNB', merchant: null, cardLast4: '7788', balance: '40', date: 1, txnDate: 2, category: 'Fuel', source: 'model', confidence: 0.9 },
    ]);
  });
});
