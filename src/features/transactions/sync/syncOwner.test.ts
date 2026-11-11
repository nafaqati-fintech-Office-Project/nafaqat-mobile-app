import { beforeEach, describe, expect, it, vi } from 'vitest';

import { claimLocalRows } from './syncOwner';

const mocks = vi.hoisted(() => ({
  store: new Map<string, string>(),
  findByExternalId: vi.fn(),
  accountHasTransactions: vi.fn(),
  newestSyncedRow: vi.fn(),
  resetSyncState: vi.fn(),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => mocks.store.get(key) ?? null,
    setItem: async (key: string, value: string) => void mocks.store.set(key, value),
  },
}));
vi.mock('./syncApi', () => ({ findByExternalId: mocks.findByExternalId, accountHasTransactions: mocks.accountHasTransactions }));
vi.mock('./syncRepo', () => ({ newestSyncedRow: mocks.newestSyncedRow, resetSyncState: mocks.resetSyncState }));

const http = (status?: number) => Object.assign(new Error('x'), { isAxiosError: true, response: status ? { status } : undefined });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.store.clear();
  mocks.resetSyncState.mockResolvedValue(undefined);
  mocks.newestSyncedRow.mockResolvedValue({ dedupeKey: 'k1', serverId: 'srv-1' });
});

describe('claimLocalRows', () => {
  it('does nothing for the account the rows were already sent to', async () => {
    mocks.store.set('sync.owner', 'u1');
    expect(await claimLocalRows('u1')).toBe(false);
    expect(mocks.resetSyncState).not.toHaveBeenCalled();
  });

  it('makes every row go again when another account signs in', async () => {
    mocks.store.set('sync.owner', 'u1');
    expect(await claimLocalRows('u2')).toBe(true);
    expect(mocks.resetSyncState).toHaveBeenCalledTimes(1);
    expect(mocks.store.get('sync.owner')).toBe('u2');
    expect(mocks.findByExternalId).not.toHaveBeenCalled();
  });

  it('keeps the rows when the signed-in account already has the newest one (owner not known yet)', async () => {
    mocks.findByExternalId.mockResolvedValue('srv-1');
    expect(await claimLocalRows('u1')).toBe(false);
    expect(mocks.findByExternalId).toHaveBeenCalledWith('sms:k1');
    expect(mocks.resetSyncState).not.toHaveBeenCalled();
    expect(mocks.store.get('sync.owner')).toBe('u1');
  });

  it('sends the rows again when the account does not have the newest one', async () => {
    mocks.findByExternalId.mockRejectedValue(http(404));
    expect(await claimLocalRows('u2')).toBe(true);
    expect(mocks.resetSyncState).toHaveBeenCalledTimes(1);
    expect(mocks.store.get('sync.owner')).toBe('u2');
  });

  it('decides nothing when the server cannot answer, and asks again next time', async () => {
    mocks.findByExternalId.mockRejectedValue(http());
    expect(await claimLocalRows('u2')).toBe(false);
    expect(mocks.resetSyncState).not.toHaveBeenCalled();
    expect(mocks.store.has('sync.owner')).toBe(false);
  });

  it('just remembers the account when nothing has been sent yet', async () => {
    mocks.newestSyncedRow.mockResolvedValue(null);
    expect(await claimLocalRows('u1')).toBe(true);
    expect(mocks.store.get('sync.owner')).toBe('u1');
  });

  it('falls back to "does the account have any transaction" when the lookup is refused, and re-sends when it has none', async () => {
    mocks.findByExternalId.mockRejectedValue(http(400));
    mocks.accountHasTransactions.mockResolvedValue(false);
    expect(await claimLocalRows('u2')).toBe(true);
    expect(mocks.resetSyncState).toHaveBeenCalledTimes(1);
  });

  it('keeps the rows when the lookup is refused but the account has transactions', async () => {
    mocks.findByExternalId.mockRejectedValue(http(400));
    mocks.accountHasTransactions.mockResolvedValue(true);
    expect(await claimLocalRows('u2')).toBe(false);
    expect(mocks.resetSyncState).not.toHaveBeenCalled();
    expect(mocks.store.get('sync.owner')).toBe('u2');
  });

  it('decides nothing when neither question can be answered', async () => {
    mocks.findByExternalId.mockRejectedValue(http(400));
    mocks.accountHasTransactions.mockRejectedValue(http());
    expect(await claimLocalRows('u2')).toBe(false);
    expect(mocks.resetSyncState).not.toHaveBeenCalled();
    expect(mocks.store.has('sync.owner')).toBe(false);
  });
});
