import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PendingSync } from './syncRepo';
import { MAX_SYNC_ATTEMPTS, syncTransactions } from './transactionSync';

const { api, repo } = vi.hoisted(() => ({
  api: { createTransaction: vi.fn(), findByExternalId: vi.fn(), updateCategory: vi.fn() },
  repo: { listPendingSync: vi.fn(), markSynced: vi.fn(), markCreated: vi.fn(), markRefused: vi.fn() },
}));
vi.mock('./syncApi', () => api);
vi.mock('./syncRepo', () => repo);

// What axios throws for an HTTP error: isAxiosError is the flag its own isAxiosError() checks.
const httpError = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, response: { status } });
const offline = () => Object.assign(new Error('Network Error'), { isAxiosError: true, code: 'ERR_NETWORK' });

const row = (id: number, overrides: Partial<PendingSync> = {}): PendingSync => ({
  id,
  dedupeKey: `key-${id}`,
  bank: 'HBL',
  type: 'DEBIT',
  amount: '100.00',
  currency: 'PKR',
  merchant: 'KFC',
  cardLast4: null,
  date: 0,
  txnDate: null,
  category: 'Food & Beverage',
  serverId: null,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  for (const fn of Object.values(repo)) fn.mockResolvedValue(undefined);
  api.updateCategory.mockResolvedValue(undefined);
});

// Runs the sync to the end, moving the fake clock past the pauses between requests.
async function run(): Promise<number> {
  const result = syncTransactions();
  await vi.runAllTimersAsync();
  return result;
}

describe('syncTransactions', () => {
  it('creates new rows and stores the server id with the category it accepted', async () => {
    repo.listPendingSync.mockResolvedValueOnce([row(1), row(2, { category: 'Transfers' })]).mockResolvedValue([]);
    api.createTransaction.mockResolvedValueOnce('srv-1').mockResolvedValueOnce('srv-2');

    expect(await run()).toBe(2);
    expect(repo.listPendingSync).toHaveBeenCalledWith(MAX_SYNC_ATTEMPTS, expect.any(Number));
    expect(api.createTransaction.mock.calls[1][0]).toMatchObject({
      externalTransactionId: 'sms:key-2',
      category: 'UNCATEGORIZED',
    });
    expect(repo.markSynced.mock.calls).toEqual([
      [1, 'srv-1', 'Food & Beverage'],
      [2, 'srv-2', 'Transfers'],
    ]);
  });

  it('sends only the new category for a row the server already has', async () => {
    repo.listPendingSync.mockResolvedValueOnce([row(3, { serverId: 'srv-3', category: 'Income', type: 'CREDIT' })]);
    expect(await run()).toBe(1);
    expect(api.createTransaction).not.toHaveBeenCalled();
    expect(api.updateCategory).toHaveBeenCalledWith('srv-3', 'Other Income');
    expect(repo.markSynced).toHaveBeenCalledWith(3, 'srv-3', 'Income');
  });

  it('after a 409 finds the copy already on the server and brings its category up to date', async () => {
    repo.listPendingSync.mockResolvedValueOnce([row(4)]);
    api.createTransaction.mockRejectedValueOnce(httpError(409));
    api.findByExternalId.mockResolvedValueOnce('srv-4');

    expect(await run()).toBe(1);
    expect(api.findByExternalId).toHaveBeenCalledWith('sms:key-4');
    expect(repo.markCreated).toHaveBeenCalledWith(4, 'srv-4');
    expect(api.updateCategory).toHaveBeenCalledWith('srv-4', 'Food & Beverage');
    expect(repo.markSynced).toHaveBeenCalledWith(4, 'srv-4', 'Food & Beverage');
  });

  it('stops the run when the server cannot be reached, without counting it against the row', async () => {
    for (const failure of [offline(), httpError(401), httpError(429), httpError(503)]) {
      vi.clearAllMocks();
      repo.listPendingSync.mockResolvedValueOnce([row(5), row(6)]);
      api.createTransaction.mockRejectedValueOnce(failure);
      expect(await run()).toBe(0);
      expect(api.createTransaction).toHaveBeenCalledTimes(1);
      expect(repo.markRefused).not.toHaveBeenCalled();
    }
  });

  it('counts a refusal against that row only and carries on', async () => {
    repo.listPendingSync.mockResolvedValueOnce([row(7), row(8)]);
    api.createTransaction.mockRejectedValueOnce(httpError(400)).mockResolvedValueOnce('srv-8');
    expect(await run()).toBe(1);
    expect(repo.markRefused).toHaveBeenCalledWith(7);
    expect(repo.markSynced).toHaveBeenCalledWith(8, 'srv-8', 'Food & Beverage');
  });

  it('refuses a row it cannot convert without calling the server', async () => {
    repo.listPendingSync.mockResolvedValueOnce([row(9, { amount: '0' })]);
    expect(await run()).toBe(0);
    expect(api.createTransaction).not.toHaveBeenCalled();
    expect(repo.markRefused).toHaveBeenCalledWith(9);
  });

  it('pauses between requests to stay under the rate limit', async () => {
    repo.listPendingSync.mockResolvedValueOnce([row(10), row(11), row(12)]);
    api.createTransaction.mockResolvedValue('srv');
    const result = syncTransactions();
    await vi.advanceTimersByTimeAsync(0);
    expect(api.createTransaction).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(200);
    expect(api.createTransaction).toHaveBeenCalledTimes(2);
    await vi.runAllTimersAsync();
    expect(await result).toBe(3);
  });

  it('runs one more pass when asked during a run, instead of a second run at once', async () => {
    let release!: (rows: PendingSync[]) => void;
    repo.listPendingSync
      .mockReturnValueOnce(new Promise((resolve) => (release = resolve)))
      .mockResolvedValueOnce([row(13)])
      .mockResolvedValue([]);
    api.createTransaction.mockResolvedValue('srv-13');

    const first = syncTransactions();
    const second = syncTransactions();
    release([]);
    await vi.runAllTimersAsync();
    expect(await first).toBe(1);
    expect(await second).toBe(1);
    expect(repo.listPendingSync).toHaveBeenCalledTimes(2);
  });

  it('never throws when the database fails', async () => {
    repo.listPendingSync.mockRejectedValueOnce(new Error('disk'));
    expect(await run()).toBe(0);
  });
});
