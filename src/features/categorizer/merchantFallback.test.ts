import { beforeEach, describe, expect, it, vi } from 'vitest';

import { categorize } from './categorize';
import { resetModelClient } from './modelClient';
import type { ParsedTxn } from '@/features/sms/parser/types';

const findUserCategory = vi.hoisted(() => vi.fn());
vi.mock('@/features/transactions/categoryRules', () => ({ findUserCategory }));
const post = vi.hoisted(() => vi.fn());
vi.mock('@/api/client', () => ({ api: { post } }));
vi.mock('@/config/flags', () => ({ AUTH_BYPASS: false }));
vi.mock('@/config/env', () => ({ API_URL: 'http://api.test', MERCHANT_FALLBACK_ENABLED: true, LLM_ONLY: false }));

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

const json = (body: unknown) => Promise.resolve({ data: body });
// What axios throws for an HTTP error: isAxiosError is the flag its own isAxiosError() checks.
const httpError = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, response: { status } });

beforeEach(() => {
  post.mockReset();
  findUserCategory.mockReset().mockResolvedValue(null);
  resetModelClient();
});

describe('server merchant fallback (enabled)', () => {
  it('sends only the redacted body and categorizes the returned merchant', async () => {
    post.mockReturnValueOnce(json({ merchant: 'KFC LAHORE' }));
    const result = await categorize(txn());
    expect(result).toEqual({ category: 'Food & Beverage', source: 'lookup', merchant: 'KFC LAHORE' });

    const [url, body] = post.mock.calls[0];
    expect(url).toBe('/api/ai-service/extract-merchant');
    const sent = body.text as string;
    expect(sent).not.toMatch(/\d/);
    expect(sent).not.toMatch(/8890|20,000|3,500/);
  });

  it('goes on to /predict when the extracted merchant is not in the lookup', async () => {
    post
      .mockReturnValueOnce(json({ merchant: 'ZZQX UNKNOWN SHOP' }))
      .mockReturnValueOnce(json({ category: 'Health', confidence: 0.8, prediction_source: 'ml' }));
    expect(await categorize(txn())).toEqual({
      category: 'Health',
      source: 'model',
      confidence: 0.8,
      merchant: 'ZZQX UNKNOWN SHOP',
    });
    expect(post.mock.calls[1][0]).toBe('/api/ai-service/predict');
  });

  it('stays Uncategorized when the server finds no merchant', async () => {
    post.mockReturnValueOnce(json({ merchant: null }));
    expect(await categorize(txn())).toEqual({ category: 'Uncategorized', source: 'fallback' });
  });

  it('keeps only the redacted body for a retry when extraction fails', async () => {
    post.mockRejectedValueOnce(httpError(500));
    const rejected = await categorize(txn());
    expect(rejected).toMatchObject({ category: 'Uncategorized', source: 'fallback', retry: 'rejected' });
    expect(rejected.retryText).toBe(post.mock.calls[0][1].text);
    expect(rejected.retryText).not.toMatch(/\d/);

    post.mockRejectedValueOnce(new Error('offline'));
    expect(await categorize(txn())).toMatchObject({ retry: 'unavailable', retryText: rejected.retryText });
  });

  it("applies the user's rule to the merchant the server found", async () => {
    post.mockReturnValueOnce(json({ merchant: 'ALI RAZA' }));
    findUserCategory.mockImplementation(async (merchant: string) => (merchant === 'ALI RAZA' ? 'Housing' : null));
    expect(await categorize(txn())).toEqual({ category: 'Housing', source: 'rule', merchant: 'ALI RAZA' });
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('keeps the extracted merchant when only the prediction fails', async () => {
    post.mockReturnValueOnce(json({ merchant: 'ZZQX UNKNOWN SHOP' })).mockRejectedValueOnce(new Error('offline'));
    expect(await categorize(txn())).toEqual({
      category: 'Uncategorized',
      source: 'fallback',
      retry: 'unavailable',
      merchant: 'ZZQX UNKNOWN SHOP',
    });
  });

  it('does not call the server when the parser already found a merchant, or for credits and transfers', async () => {
    post.mockReturnValue(json({ category: 'Health', confidence: 0.9, prediction_source: 'ml' }));
    await categorize(txn({ merchant: 'KFC LAHORE' }));
    await categorize(txn({ type: 'CREDIT' }));
    await categorize(txn({ raw: 'sent via RAAST to someone' }));
    expect(post.mock.calls.some(([url]) => String(url).includes('extract-merchant'))).toBe(false);
  });
});
