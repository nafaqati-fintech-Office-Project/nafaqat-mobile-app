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

const modelResponse = (category: string, confidence: number, prediction_source = 'ml') =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ category, confidence, prediction_source }),
  });

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

  it('uses the model category', async () => {
    fetchMock.mockReturnValue(modelResponse('Health', 0.8));
    expect(await categorize(txn())).toEqual({ category: 'Health', source: 'model', confidence: 0.8 });
  });

  it('still shows a low-confidence model category', async () => {
    fetchMock.mockReturnValue(modelResponse('Health', 0.3));
    expect(await categorize(txn())).toEqual({ category: 'Health', source: 'model', confidence: 0.3 });
  });

  it('marks a Gemini answer as llm even when the model confidence is low', async () => {
    fetchMock.mockReturnValue(modelResponse('Housing', 0.13, 'llm'));
    expect(await categorize(txn())).toEqual({ category: 'Housing', source: 'llm', confidence: 0.13 });
  });

  it('maps a verified-merchant answer to lookup', async () => {
    fetchMock.mockReturnValue(modelResponse('Fuel', 0.2, 'historical_lookup'));
    expect(await categorize(txn())).toMatchObject({ category: 'Fuel', source: 'lookup' });
  });

  it('treats a server "unknown" answer as Uncategorized', async () => {
    fetchMock.mockReturnValue(modelResponse('Unknown', 0, 'unknown'));
    expect(await categorize(txn())).toEqual({ category: 'Uncategorized', source: 'fallback' });
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
    await vi.advanceTimersByTimeAsync(15000);
    expect(await pending).toEqual({ category: 'Uncategorized', source: 'fallback' });
  });

  it('falls back when the server errors', async () => {
    fetchMock.mockReturnValue(Promise.resolve({ ok: false }));
    expect(await categorize(txn())).toMatchObject({ category: 'Uncategorized', source: 'fallback' });
  });

  it('labels RAAST/IBFT transfers as Transfers without calling the model', async () => {
    const result = await categorize(txn({ merchant: 'SARA KHAN', raw: 'sent to SARA KHAN of IBAN No via RAAST' }));
    expect(result).toEqual({ category: 'Transfers', source: 'lookup' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not treat a NayaPay "Retail Payment" paid over Raast as a transfer', async () => {
    const raw = 'Retail Payment Paid to SAWAD RESTAURANT Raast Service Fee Rs. 0 -Rs. 320';
    const result = await categorize(txn({ merchant: 'SAWAD RESTAURANT', raw }));
    expect(result.category).not.toBe('Transfers');
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
