import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  listPendingPredictions,
  listTransactions,
  saveRetryResult,
  saveTransaction,
  transactionKey,
} from './transactionsRepo';
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
  db.getFirstAsync.mockResolvedValue({ user_version: 15 });
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

  it('adds the retry columns and flags old uncategorized debits once', async () => {
    vi.resetModules();
    db.getFirstAsync.mockResolvedValue({ user_version: 3 });
    const { getDb } = await import('./db');
    await getDb();
    const statements = db.execAsync.mock.calls.map(([sql]) => String(sql));
    expect(statements).toContain('ALTER TABLE transactions ADD COLUMN needs_prediction INTEGER NOT NULL DEFAULT 0');
    expect(statements).toContain('ALTER TABLE transactions ADD COLUMN retry_text TEXT');
    const backfill = statements.find((sql) => sql.startsWith('UPDATE transactions SET needs_prediction = 1'));
    expect(backfill).toMatch(/type = 'DEBIT'.*category = 'Uncategorized'.*merchant IS NOT NULL/s);
    expect(statements).not.toContain('ALTER TABLE transactions ADD COLUMN balance TEXT');
    expect(statements).toContain('PRAGMA user_version = 13');
    expect(statements).toContain('ALTER TABLE transactions ADD COLUMN server_id TEXT');
    expect(statements).toContain('ALTER TABLE transactions ADD COLUMN prediction_id TEXT');
    expect(statements).toContain('ALTER TABLE category_feedback ADD COLUMN prediction_id TEXT');
    expect(statements).toContain('PRAGMA user_version = 15');
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
    // a duplicate also tries to upgrade the stored category (a second statement), which changes nothing here
    db.runAsync.mockResolvedValueOnce({ changes: 1 }).mockResolvedValueOnce({ changes: 0 }).mockResolvedValueOnce({ changes: 0 });
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

describe('saving a transaction the model could not categorize', () => {
  // needs_prediction, prediction_attempts, retry_text (prediction_id comes last)
  const flags = () => (db.runAsync.mock.calls[0][1] as unknown[]).slice(-4, -1);
  const predictionId = () => (db.runAsync.mock.calls[0][1] as unknown[]).at(-1);

  it('saves an answered row as not pending', async () => {
    db.runAsync.mockResolvedValue({ changes: 1 });
    await saveTransaction(processed);
    expect(flags()).toEqual([0, 0, null]);
    expect(predictionId()).toBeNull();
  });

  it('keeps the server\'s prediction id with the row', async () => {
    db.runAsync.mockResolvedValue({ changes: 1 });
    await saveTransaction({ ...processed, source: 'model', confidence: 0.9, predictionId: 'p-1' });
    expect(String(db.runAsync.mock.calls[0][0])).toMatch(/retry_text, prediction_id\)/);
    expect(predictionId()).toBe('p-1');
  });

  it('flags an unreachable model without counting an attempt', async () => {
    db.runAsync.mockResolvedValue({ changes: 1 });
    await saveTransaction({ ...processed, category: 'Uncategorized', source: 'fallback', retry: 'unavailable' });
    expect(flags()).toEqual([1, 0, null]);
  });

  it('counts a refusal and keeps the redacted text for extraction', async () => {
    db.runAsync.mockResolvedValue({ changes: 1 });
    await saveTransaction({
      ...processed,
      category: 'Uncategorized',
      source: 'fallback',
      retry: 'rejected',
      retryText: 'paid at shop',
    });
    expect(flags()).toEqual([1, 1, 'paid at shop']);
  });
});

describe('pending predictions', () => {
  it('lists pending rows under the attempt limit', async () => {
    db.getAllAsync.mockResolvedValue([{ id: 4, merchant: null, retry_text: 'paid at shop' }]);
    expect(await listPendingPredictions(5, 100)).toEqual([{ id: 4, merchant: null, retryText: 'paid at shop' }]);
    const [sql, params] = db.getAllAsync.mock.calls[0];
    expect(sql).toMatch(/needs_prediction = 1 AND prediction_attempts < \?/);
    expect(params).toEqual([5, 100]);
  });

  it('stores an answer and clears the flag and the redacted text', async () => {
    await saveRetryResult(4, { category: 'Health', source: 'model', confidence: 0.8, predictionId: 'p-4', merchant: 'ZZQX SHOP' });
    const [sql, params] = db.runAsync.mock.calls[0];
    expect(sql).toMatch(/needs_prediction = 0, retry_text = NULL/);
    // a category the user picked meanwhile (no longer pending) is left alone
    expect(sql).toMatch(/WHERE id = \? AND needs_prediction = 1/);
    expect(params).toEqual(['Health', 'model', 0.8, 'p-4', 'ZZQX SHOP', 4]);
  });

  it('keeps a failed retry pending and counts only a refusal', async () => {
    await saveRetryResult(4, { category: 'Uncategorized', source: 'fallback', retry: 'unavailable', retryText: 't' });
    await saveRetryResult(4, { category: 'Uncategorized', source: 'fallback', retry: 'rejected', merchant: 'ZZQX SHOP' });
    expect(String(db.runAsync.mock.calls[0][0])).toMatch(/WHERE id = \? AND needs_prediction = 1/);
    expect(String(db.runAsync.mock.calls[0][0])).not.toMatch(/needs_prediction = 0/);
    expect(db.runAsync.mock.calls[0][1]).toEqual([null, 't', 0, 4]);
    // the merchant was extracted, so only the prediction is left: the redacted text is dropped
    expect(db.runAsync.mock.calls[1][1]).toEqual(['ZZQX SHOP', null, 1, 4]);
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
