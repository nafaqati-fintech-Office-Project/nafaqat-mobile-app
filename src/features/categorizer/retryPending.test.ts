import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MAX_ATTEMPTS, retryPendingPredictions } from './retryPending';
import type { Categorized } from './categorize';

const { categorizeMerchant, categorizeRedacted, userCategory, repo } = vi.hoisted(() => ({
  categorizeMerchant: vi.fn(),
  categorizeRedacted: vi.fn(),
  userCategory: vi.fn(),
  repo: {
    listPendingPredictions: vi.fn(),
    saveRetryResult: vi.fn(),
    emitTransactionsChanged: vi.fn(),
  },
}));
vi.mock('./categorize', () => ({ categorizeMerchant, categorizeRedacted, userCategory }));
vi.mock('@/features/transactions/transactionsRepo', () => repo);

const row = (id: number, merchant: string | null, retryText: string | null = null) => ({ id, merchant, retryText });
const answer = (category: string): Categorized => ({ category, source: 'model', confidence: 0.9 });
const failed = (retry: Categorized['retry']): Categorized => ({ category: 'Uncategorized', source: 'fallback', retry });
const saved = () => repo.saveRetryResult.mock.calls.map(([id, result]) => [id, result.category, result.retry]);

beforeEach(() => {
  vi.clearAllMocks();
  repo.saveRetryResult.mockResolvedValue(undefined);
  userCategory.mockResolvedValue(null);
});

describe('retryPendingPredictions', () => {
  it('asks once per merchant and stores the answer on every row', async () => {
    repo.listPendingPredictions.mockResolvedValue([row(1, 'ZZQX SHOP'), row(2, 'ABC MART'), row(3, 'ZZQX SHOP ')]);
    categorizeMerchant.mockImplementation(async (m: string) => answer(m === 'ZZQX SHOP' ? 'Health' : 'Groceries'));

    expect(await retryPendingPredictions()).toBe(3);
    expect(repo.listPendingPredictions).toHaveBeenCalledWith(MAX_ATTEMPTS, expect.any(Number));
    expect(categorizeMerchant).toHaveBeenCalledTimes(2);
    expect(saved()).toEqual([
      [1, 'Health', undefined],
      [3, 'Health', undefined],
      [2, 'Groceries', undefined],
    ]);
    expect(repo.emitTransactionsChanged).toHaveBeenCalledTimes(1);
  });

  it("uses the user's rule for the merchant instead of asking the model", async () => {
    repo.listPendingPredictions.mockResolvedValue([row(1, 'ALI RAZA')]);
    userCategory.mockResolvedValue({ category: 'Housing', source: 'rule' });
    expect(await retryPendingPredictions()).toBe(1);
    expect(userCategory).toHaveBeenCalledWith('ALI RAZA', 'DEBIT');
    expect(categorizeMerchant).not.toHaveBeenCalled();
    expect(saved()).toEqual([[1, 'Housing', undefined]]);
  });

  it('redoes merchant extraction for rows that kept the redacted text', async () => {
    repo.listPendingPredictions.mockResolvedValue([row(5, null, 'paid at shop')]);
    categorizeRedacted.mockResolvedValue({ ...answer('Health'), merchant: 'ZZQX SHOP' });
    expect(await retryPendingPredictions()).toBe(1);
    expect(categorizeRedacted).toHaveBeenCalledWith('paid at shop');
    expect(categorizeMerchant).not.toHaveBeenCalled();
  });

  it('stops the run when the model is unreachable and changes nothing on screen', async () => {
    const rows = Array.from({ length: 12 }, (_, i) => row(i, `SHOP ${i}`));
    repo.listPendingPredictions.mockResolvedValue(rows);
    categorizeMerchant.mockResolvedValue(failed('unavailable'));

    expect(await retryPendingPredictions()).toBe(0);
    expect(categorizeMerchant.mock.calls.length).toBeLessThan(rows.length);
    expect(repo.emitTransactionsChanged).not.toHaveBeenCalled();
  });

  it('records a refusal and carries on with the next rows', async () => {
    const rows = Array.from({ length: 8 }, (_, i) => row(i, `SHOP ${i}`));
    repo.listPendingPredictions.mockResolvedValue(rows);
    categorizeMerchant.mockImplementation(async (m: string) => (m === 'SHOP 0' ? failed('rejected') : answer('Health')));

    expect(await retryPendingPredictions()).toBe(7);
    expect(categorizeMerchant).toHaveBeenCalledTimes(8);
    expect(saved()[0]).toEqual([0, 'Uncategorized', 'rejected']);
  });

  it('settles a row that has nothing left to ask with', async () => {
    repo.listPendingPredictions.mockResolvedValue([row(9, '  ')]);
    expect(await retryPendingPredictions()).toBe(1);
    expect(saved()).toEqual([[9, 'Uncategorized', undefined]]);
    expect(categorizeMerchant).not.toHaveBeenCalled();
  });

  it('joins a run already in progress instead of starting another', async () => {
    let release!: (rows: unknown[]) => void;
    repo.listPendingPredictions.mockReturnValue(new Promise((resolve) => (release = resolve)));
    const first = retryPendingPredictions();
    const second = retryPendingPredictions();
    release([]);
    expect(await first).toBe(0);
    expect(await second).toBe(0);
    expect(repo.listPendingPredictions).toHaveBeenCalledTimes(1);
  });

  it('never throws when the database fails', async () => {
    repo.listPendingPredictions.mockRejectedValue(new Error('disk'));
    expect(await retryPendingPredictions()).toBe(0);
  });
});
