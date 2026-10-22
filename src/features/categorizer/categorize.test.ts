import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { categorize } from './categorize';
import { lookupCategory } from './lookup';
import data from './merchantLookup.json';
import type { ParsedTxn } from '@/features/sms/parser/types';

const txn = (overrides: Partial<ParsedTxn> = {}): ParsedTxn => ({
  smsId: '1',
  bank: 'HBL',
  type: 'DEBIT',
  amount: '100',
  currency: 'PKR',
  merchant: 'ZZQX UNKNOWN SHOP',
  cardLast4: null,
  date: 0,
  raw: '',
  ...overrides,
});

const modelResponse = (category: string, confidence: number) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({ category, confidence }) });

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('lookupCategory', () => {
  it('matches a known merchant by token', () => {
    expect(lookupCategory('KFC LAHORE 123')).toBe('Food & Beverage');
  });

  it('does not match inside a longer word', () => {
    expect(lookupCategory('KFCX SHOP')).toBeNull();
  });

  it('rejects short patterns such as "J."', () => {
    expect(lookupCategory('J. SMITH')).toBeNull();
    expect(data.every((entry) => entry.pattern.length >= 3)).toBe(true);
  });
});

describe('categorize', () => {
  it('uses the lookup and skips the model', async () => {
    const result = await categorize(txn({ merchant: 'KFC LAHORE' }));
    expect(result).toEqual({ category: 'Food & Beverage', source: 'lookup' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses the model at or above the threshold', async () => {
    fetchMock.mockReturnValue(modelResponse('Health', 0.8));
    expect(await categorize(txn())).toEqual({ category: 'Health', source: 'model', confidence: 0.8 });
  });

  it('falls back below the threshold', async () => {
    fetchMock.mockReturnValue(modelResponse('Health', 0.3));
    expect(await categorize(txn())).toMatchObject({ category: 'Uncategorized', source: 'fallback' });
  });

  it('falls back when the request times out', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const pending = categorize(txn());
    await vi.advanceTimersByTimeAsync(5000);
    expect(await pending).toEqual({ category: 'Uncategorized', source: 'fallback', confidence: undefined });
  });

  it('falls back when the server errors', async () => {
    fetchMock.mockReturnValue(Promise.resolve({ ok: false }));
    expect(await categorize(txn())).toMatchObject({ category: 'Uncategorized', source: 'fallback' });
  });

  it('never sends credits to the model', async () => {
    expect(await categorize(txn({ type: 'CREDIT' }))).toEqual({ category: 'Income', source: 'fallback' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('skips the model for an empty merchant', async () => {
    expect(await categorize(txn({ merchant: '  ' }))).toEqual({ category: 'Uncategorized', source: 'fallback' });
    expect(await categorize(txn({ merchant: null }))).toEqual({ category: 'Uncategorized', source: 'fallback' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
