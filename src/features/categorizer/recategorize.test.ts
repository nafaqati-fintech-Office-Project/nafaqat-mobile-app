import { beforeEach, describe, expect, it, vi } from 'vitest';

import { recategorizeOldRows } from './recategorize';

const mocks = vi.hoisted(() => ({
  store: new Map<string, string>(),
  categorize: vi.fn(),
  categorizeLocally: vi.fn(),
  readSmsById: vi.fn(),
  userId: { value: 'u1' as string | null },
  repo: { listRecategorizeCandidates: vi.fn(), saveRecategorized: vi.fn(), emitTransactionsChanged: vi.fn() },
}));

vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => mocks.store.get(key) ?? null,
    setItem: async (key: string, value: string) => void mocks.store.set(key, value),
  },
}));
vi.mock('./categorize', () => ({ categorize: mocks.categorize, categorizeLocally: mocks.categorizeLocally }));
vi.mock('@/auth/currentUser', () => ({ getCurrentUserId: () => mocks.userId.value }));
vi.mock('@/features/sms/smsReader', () => ({ readSmsById: mocks.readSmsById }));
vi.mock('@/features/transactions/transactionsRepo', () => mocks.repo);

const row = (id: number, category: string, merchant: string | null = null) => ({
  id,
  smsId: `sms${id}`,
  bank: 'SNB',
  type: 'DEBIT' as const,
  amount: '100',
  currency: 'SAR',
  merchant,
  cardLast4: null,
  balance: null,
  date: 0,
  txnDate: null,
  category,
});
const sms = (body: string) => ({ id: 'x', address: 'SNB', body, date: 0 });
const answer = (category: string) => ({ category, source: 'lookup' as const });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.store.clear();
  mocks.userId.value = 'u1';
  mocks.repo.saveRecategorized.mockResolvedValue(true);
});

describe('recategorizeOldRows', () => {
  it('reads the SMS again and moves a row to the better category', async () => {
    mocks.repo.listRecategorizeCandidates.mockResolvedValue([row(1, 'Income')]);
    mocks.readSmsById.mockResolvedValue(sms('SAR 28 refunded to card 4821'));
    mocks.categorizeLocally.mockResolvedValue(answer('Refunds'));

    expect(await recategorizeOldRows()).toBe(1);
    expect(mocks.categorizeLocally.mock.calls[0][0].raw).toBe('SAR 28 refunded to card 4821');
    expect(mocks.repo.saveRecategorized).toHaveBeenCalledWith(1, 'Income', answer('Refunds'));
    expect(mocks.repo.emitTransactionsChanged).toHaveBeenCalled();
  });

  it('lets only a row that is still Uncategorized ask the model', async () => {
    mocks.repo.listRecategorizeCandidates.mockResolvedValue([row(1, 'Uncategorized', 'DANUBE FO'), row(2, 'Fuel', 'X')]);
    mocks.readSmsById.mockResolvedValue(sms('POS purchase'));
    mocks.categorize.mockResolvedValue(answer('Groceries'));
    mocks.categorizeLocally.mockResolvedValue(null);

    await recategorizeOldRows();
    expect(mocks.categorize).toHaveBeenCalledTimes(1);
    expect(mocks.categorizeLocally).toHaveBeenCalledTimes(1);
  });

  it('leaves a row alone when nothing better is found, the model failed, or the SMS is gone', async () => {
    mocks.repo.listRecategorizeCandidates.mockResolvedValue([row(1, 'Fuel'), row(2, 'Uncategorized', 'A'), row(3, 'Income')]);
    mocks.readSmsById.mockImplementation(async (id: string) => (id === 'sms3' ? null : sms('text')));
    mocks.categorizeLocally.mockResolvedValue(answer('Fuel'));
    mocks.categorize.mockResolvedValue({ category: 'Uncategorized', source: 'fallback', retry: 'unavailable' });

    expect(await recategorizeOldRows()).toBe(0);
    expect(mocks.repo.saveRecategorized).not.toHaveBeenCalled();
    expect(mocks.repo.emitTransactionsChanged).not.toHaveBeenCalled();
  });

  it('runs once per account, then does nothing', async () => {
    mocks.repo.listRecategorizeCandidates.mockResolvedValue([]);
    await recategorizeOldRows();
    await recategorizeOldRows();
    expect(mocks.repo.listRecategorizeCandidates).toHaveBeenCalledTimes(1);
  });

  it('tries again next time when the inbox could not be read', async () => {
    mocks.repo.listRecategorizeCandidates.mockResolvedValue([row(1, 'Income')]);
    mocks.readSmsById.mockRejectedValue(new Error('no permission'));
    await recategorizeOldRows();
    await recategorizeOldRows();
    expect(mocks.repo.listRecategorizeCandidates).toHaveBeenCalledTimes(2);
  });

  it('does nothing while signed out', async () => {
    mocks.userId.value = null;
    expect(await recategorizeOldRows()).toBe(0);
    expect(mocks.repo.listRecategorizeCandidates).not.toHaveBeenCalled();
  });
});
