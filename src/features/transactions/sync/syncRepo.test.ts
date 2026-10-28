import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listPendingSync, markCreated, markRefused, markSynced } from './syncRepo';

const db = { execAsync: vi.fn(), runAsync: vi.fn(), getAllAsync: vi.fn(), getFirstAsync: vi.fn() };
vi.mock('expo-sqlite', () => ({ openDatabaseAsync: () => Promise.resolve(db) }));

beforeEach(() => {
  vi.clearAllMocks();
  db.getFirstAsync.mockResolvedValue({ user_version: 13 });
});

describe('listPendingSync', () => {
  it('picks rows the server lacks or whose category changed, within the limits, oldest first', async () => {
    db.getAllAsync.mockResolvedValue([]);
    await listPendingSync(3, 200);
    const [sql, params] = db.getAllAsync.mock.calls[0];
    expect(sql).toMatch(/server_id IS NULL OR synced_category IS NOT category/);
    expect(sql).toMatch(/sync_attempts < \? AND currency IN \(\?, \?, \?, \?, \?, \?, \?\)/);
    expect(sql).toMatch(/ORDER BY date ASC LIMIT \?/);
    expect(params).toEqual([3, 'PKR', 'AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 200]);
  });

  it('maps rows to camelCase', async () => {
    db.getAllAsync.mockResolvedValue([
      { id: 1, dedupe_key: 'k', bank: 'HBL', type: 'DEBIT', amount: '5', currency: 'PKR', merchant: null, card_last4: '12', date: 1, txn_date: 2, category: 'Fuel', server_id: 's' },
    ]);
    expect(await listPendingSync(3, 200)).toEqual([
      { id: 1, dedupeKey: 'k', bank: 'HBL', type: 'DEBIT', amount: '5', currency: 'PKR', merchant: null, cardLast4: '12', date: 1, txnDate: 2, category: 'Fuel', serverId: 's' },
    ]);
  });
});

describe('marking rows', () => {
  it('stores the server id and accepted category, and clears earlier refusals', async () => {
    await markSynced(1, 'srv', 'Fuel');
    expect(db.runAsync.mock.calls[0]).toEqual([expect.stringMatching(/sync_attempts = 0/), ['srv', 'Fuel', 1]]);
  });

  it('keeps the server id alone when the category is still to be sent', async () => {
    await markCreated(1, 'srv');
    expect(db.runAsync.mock.calls[0][0]).not.toMatch(/synced_category/);
  });

  it('counts a refusal', async () => {
    await markRefused(1);
    expect(db.runAsync.mock.calls[0]).toEqual([expect.stringMatching(/sync_attempts = sync_attempts \+ 1/), [1]]);
  });
});
