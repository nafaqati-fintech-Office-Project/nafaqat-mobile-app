import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { categorize } from './categorize';
import type { ParsedTxn } from '@/features/sms/parser/types';

vi.mock('@/config/env', () => ({ API_URL: 'http://api.test', MERCHANT_FALLBACK_ENABLED: true }));

const txn = (overrides: Partial<ParsedTxn> = {}): ParsedTxn => ({
  smsId: '1',
  bank: 'HBL',
  type: 'DEBIT',
  amount: '100',
  currency: 'PKR',
  merchant: null,
  cardLast4: '8890',
  date: 0,
  raw: 'Rs. 3,500.00 debited from A/C **8890 on 26-Oct-26 for payment at KFC LAHORE. Bal Rs 20,000.00',
  ...overrides,
});

const json = (body: unknown, ok = true) => Promise.resolve({ ok, json: () => Promise.resolve(body) });
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('server merchant fallback (enabled)', () => {
  it('sends only the redacted body and categorizes the returned merchant', async () => {
    fetchMock.mockReturnValueOnce(json({ merchant: 'KFC LAHORE' }));
    const result = await categorize(txn());
    expect(result).toEqual({ category: 'Food & Beverage', source: 'lookup', merchant: 'KFC LAHORE' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/extract-merchant');
    const sent = JSON.parse(init.body).text as string;
    expect(sent).not.toMatch(/\d/);
    expect(sent).not.toMatch(/8890|20,000|3,500/);
  });

  it('goes on to /predict when the extracted merchant is not in the lookup', async () => {
    fetchMock
      .mockReturnValueOnce(json({ merchant: 'ZZQX UNKNOWN SHOP' }))
      .mockReturnValueOnce(json({ category: 'Health', confidence: 0.8, prediction_source: 'ml' }));
    expect(await categorize(txn())).toEqual({
      category: 'Health',
      source: 'model',
      confidence: 0.8,
      merchant: 'ZZQX UNKNOWN SHOP',
    });
    expect(fetchMock.mock.calls[1][0]).toBe('http://api.test/predict');
  });

  it('stays Uncategorized when the server finds no merchant or fails', async () => {
    fetchMock.mockReturnValueOnce(json({ merchant: null }));
    expect(await categorize(txn())).toEqual({ category: 'Uncategorized', source: 'fallback' });
    fetchMock.mockReturnValueOnce(json({}, false));
    expect(await categorize(txn())).toEqual({ category: 'Uncategorized', source: 'fallback' });
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    expect(await categorize(txn())).toEqual({ category: 'Uncategorized', source: 'fallback' });
  });

  it('does not call the server when the parser already found a merchant, or for credits and transfers', async () => {
    fetchMock.mockReturnValue(json({ category: 'Health', confidence: 0.9, prediction_source: 'ml' }));
    await categorize(txn({ merchant: 'KFC LAHORE' }));
    await categorize(txn({ type: 'CREDIT' }));
    await categorize(txn({ raw: 'sent via RAAST to someone' }));
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('extract-merchant'))).toBe(false);
  });
});
