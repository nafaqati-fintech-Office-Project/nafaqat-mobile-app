import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  cancelDeletion,
  getOpenDeletion,
  openRequest,
  parseDeletionRequest,
  requestDeletion,
  signOutEverywhere,
} from './deletionApi';
import { CONFIRM_WORD, isConfirmed } from './deletionForm';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/api/client', () => ({ api: http }));

const raw = (status: string, id = 'r1') => ({
  id,
  userId: 'u1',
  status,
  requestedAt: '2026-11-12T10:00:00Z',
  purgeAfter: '2026-12-12T10:00:00Z',
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe('parsing', () => {
  it('reads a request', () => {
    expect(parseDeletionRequest(raw('REQUESTED'))).toEqual({
      id: 'r1',
      status: 'REQUESTED',
      requestedAt: '2026-11-12T10:00:00Z',
      purgeAfter: '2026-12-12T10:00:00Z',
    });
  });

  it('refuses an unknown status', () => {
    expect(() => parseDeletionRequest(raw('GONE'))).toThrow();
  });

  it('finds the request the user can still cancel', () => {
    const list = [raw('CANCELLED', 'a'), raw('REQUESTED', 'b')].map(parseDeletionRequest);
    expect(openRequest(list)?.id).toBe('b');
    expect(openRequest([parseDeletionRequest(raw('COMPLETED'))])).toBeNull();
    expect(openRequest([])).toBeNull();
  });
});

describe('calls', () => {
  it('requests, lists, cancels and signs out everywhere on the right paths', async () => {
    http.post.mockResolvedValue({ data: raw('REQUESTED') });
    http.get.mockResolvedValue({ data: [raw('REQUESTED')] });

    expect((await requestDeletion()).status).toBe('REQUESTED');
    expect(http.post).toHaveBeenLastCalledWith('/api/users/me/deletion-requests');

    expect((await getOpenDeletion())?.id).toBe('r1');
    expect(http.get).toHaveBeenLastCalledWith('/api/users/me/deletion-requests');

    http.post.mockResolvedValue({ data: raw('CANCELLED') });
    expect((await cancelDeletion('r1')).status).toBe('CANCELLED');
    expect(http.post).toHaveBeenLastCalledWith('/api/users/me/deletion-requests/r1/cancel');

    await signOutEverywhere();
    expect(http.post).toHaveBeenLastCalledWith('/api/auth/logout-all');
  });

  it('has no open request when everything is closed', async () => {
    http.get.mockResolvedValue({ data: [raw('CANCELLED')] });
    expect(await getOpenDeletion()).toBeNull();
  });
});

describe('confirmation', () => {
  it('needs the confirmation word, ignoring case and spaces around it', () => {
    expect(isConfirmed(CONFIRM_WORD)).toBe(true);
    expect(isConfirmed(`  ${CONFIRM_WORD.toLowerCase()} `)).toBe(true);
    expect(isConfirmed('DELET')).toBe(false);
    expect(isConfirmed('')).toBe(false);
  });
});
