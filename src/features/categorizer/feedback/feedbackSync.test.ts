import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FEEDBACK_KEPT, FEEDBACK_SENT, type PendingFeedback } from './feedbackRepo';
import { syncFeedback, toFeedbackBody } from './feedbackSync';
import { setCurrentUserId } from '@/auth/currentUser';

const { api, repo } = vi.hoisted(() => ({
  api: { postFeedback: vi.fn() },
  repo: { listPendingFeedback: vi.fn(), markFeedback: vi.fn() },
}));
vi.mock('./feedbackApi', () => api);
vi.mock('./feedbackRepo', () => ({ ...repo, FEEDBACK_PENDING: 0, FEEDBACK_SENT: 1, FEEDBACK_KEPT: 2 }));

const httpError = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, response: { status } });
const offline = () => Object.assign(new Error('Network Error'), { isAxiosError: true, code: 'ERR_NETWORK' });

const row = (id: number, overrides: Partial<PendingFeedback> = {}): PendingFeedback => ({
  id,
  merchant: ' Shell ',
  type: 'DEBIT',
  fromCategory: 'Transportation',
  fromSource: 'model',
  toCategory: 'Fuel',
  predictionId: 'a'.repeat(32),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  setCurrentUserId('user-1');
  repo.markFeedback.mockResolvedValue(undefined);
  api.postFeedback.mockResolvedValue(undefined);
});

async function run(): Promise<number> {
  const result = syncFeedback();
  await vi.runAllTimersAsync();
  return result;
}

describe('toFeedbackBody', () => {
  it('sends the merchant, both categories and the prediction id', () => {
    expect(toFeedbackBody(row(1))).toEqual({
      merchant: 'Shell',
      from_category: 'Transportation',
      from_source: 'model',
      to_category: 'Fuel',
      prediction_id: 'a'.repeat(32),
    });
  });

  it('sends corrections of the model, Gemini and the merchant lists', () => {
    for (const fromSource of ['model', 'llm', 'lookup']) expect(toFeedbackBody(row(1, { fromSource }))).not.toBeNull();
  });

  it('keeps on the phone what was not a prediction or may be a person', () => {
    const kept: Partial<PendingFeedback>[] = [
      { fromSource: 'user' },
      { fromSource: 'rule' },
      // Not asked to the model, so it may be a person's name.
      { fromSource: 'fallback', fromCategory: 'Uncategorized' },
      { fromCategory: 'Person', fromSource: 'llm', merchant: 'Ali Raza' },
      { fromCategory: 'Transfers', fromSource: 'lookup' },
      { type: 'CREDIT', toCategory: 'Salary' },
      { toCategory: 'Transfers' },
      { merchant: '  ' },
      { merchant: null },
      { toCategory: 'Transportation' },
    ];
    for (const overrides of kept) expect(toFeedbackBody(row(1, overrides)), JSON.stringify(overrides)).toBeNull();
  });
});

describe('syncFeedback', () => {
  it('sends this user\'s changes and marks them sent', async () => {
    repo.listPendingFeedback.mockResolvedValueOnce([row(1), row(2, { merchant: 'KFC', toCategory: 'Food & Beverage' })]);

    expect(await run()).toBe(2);
    expect(repo.listPendingFeedback).toHaveBeenCalledWith('user-1', expect.any(Number));
    expect(api.postFeedback.mock.calls[1][0]).toMatchObject({ merchant: 'KFC', to_category: 'Food & Beverage' });
    expect(repo.markFeedback.mock.calls).toEqual([
      [1, FEEDBACK_SENT],
      [2, FEEDBACK_SENT],
    ]);
  });

  it('marks changes that must stay on the phone without sending them', async () => {
    repo.listPendingFeedback.mockResolvedValueOnce([row(1, { fromSource: 'user' }), row(2)]);

    expect(await run()).toBe(1);
    expect(api.postFeedback).toHaveBeenCalledTimes(1);
    expect(repo.markFeedback.mock.calls).toEqual([
      [1, FEEDBACK_KEPT],
      [2, FEEDBACK_SENT],
    ]);
  });

  it('keeps a change the server refused so it is not sent again', async () => {
    repo.listPendingFeedback.mockResolvedValueOnce([row(1), row(2)]);
    api.postFeedback.mockRejectedValueOnce(httpError(422));

    expect(await run()).toBe(1);
    expect(repo.markFeedback.mock.calls).toEqual([
      [1, FEEDBACK_KEPT],
      [2, FEEDBACK_SENT],
    ]);
  });

  it('stops and leaves the rest pending when the server is unavailable', async () => {
    for (const error of [offline(), httpError(401), httpError(429), httpError(503)]) {
      vi.clearAllMocks();
      repo.listPendingFeedback.mockResolvedValueOnce([row(1), row(2)]);
      api.postFeedback.mockRejectedValueOnce(error);

      expect(await run()).toBe(0);
      expect(api.postFeedback).toHaveBeenCalledTimes(1);
      expect(repo.markFeedback).not.toHaveBeenCalled();
    }
  });

  it('does nothing while signed out', async () => {
    setCurrentUserId(null);
    expect(await run()).toBe(0);
    expect(repo.listPendingFeedback).not.toHaveBeenCalled();
  });
});
