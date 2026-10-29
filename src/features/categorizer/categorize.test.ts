import { beforeEach, describe, expect, it, vi } from 'vitest';

import { categorize } from './categorize';
import { lookupCategory } from './lookup';
import { resetModelClient } from './modelClient';
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

const findUserCategory = vi.hoisted(() => vi.fn());
vi.mock('@/features/transactions/categoryRules', () => ({ findUserCategory }));
const post = vi.hoisted(() => vi.fn());
vi.mock('@/api/client', () => ({ api: { post } }));
vi.mock('@/config/flags', () => ({ AUTH_BYPASS: false }));

const modelResponse = (category: string, confidence: number, prediction_source = 'ml') =>
  Promise.resolve({ data: { category, confidence, prediction_source } });

beforeEach(() => {
  post.mockReset();
  findUserCategory.mockReset().mockResolvedValue(null);
  resetModelClient();
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

describe("the user's own rule", () => {
  it('wins over the lookup, the transfer rule, income and the model', async () => {
    findUserCategory.mockResolvedValue('Housing');
    expect(await categorize(txn({ merchant: 'KFC LAHORE' }))).toEqual({ category: 'Housing', source: 'rule' });
    expect(await categorize(txn({ merchant: 'ALI RAZA', raw: 'sent to ALI RAZA via RAAST' }))).toEqual({
      category: 'Housing',
      source: 'rule',
    });
    expect(await categorize(txn({ type: 'CREDIT', merchant: 'ALI RAZA' }))).toEqual({ category: 'Housing', source: 'rule' });
    expect(post).not.toHaveBeenCalled();
  });

  it('is looked up by merchant and by money in or out', async () => {
    await categorize(txn({ type: 'CREDIT', merchant: '  ALI RAZA ' }));
    expect(findUserCategory).toHaveBeenCalledWith('ALI RAZA', 'CREDIT');
  });

  it('is not looked up without a merchant', async () => {
    await categorize(txn({ merchant: null }));
    expect(findUserCategory).not.toHaveBeenCalled();
  });
});

describe('categorize', () => {
  it('uses the lookup and skips the model', async () => {
    const result = await categorize(txn({ merchant: 'KFC LAHORE' }));
    expect(result).toEqual({ category: 'Food & Beverage', source: 'lookup' });
    expect(post).not.toHaveBeenCalled();
  });

  it('uses the model category', async () => {
    post.mockReturnValue(modelResponse('Health', 0.8));
    expect(await categorize(txn())).toEqual({ category: 'Health', source: 'model', confidence: 0.8 });
  });

  it('keeps the server\'s prediction id for a later correction', async () => {
    post.mockResolvedValue({ data: { category: 'Health', confidence: 0.8, prediction_source: 'ml', prediction_id: 'p-1' } });
    expect(await categorize(txn())).toEqual({ category: 'Health', source: 'model', confidence: 0.8, predictionId: 'p-1' });
  });

  it('still shows a low-confidence model category', async () => {
    post.mockReturnValue(modelResponse('Health', 0.3));
    expect(await categorize(txn())).toEqual({ category: 'Health', source: 'model', confidence: 0.3 });
  });

  it('marks a Gemini answer as llm even when the model confidence is low', async () => {
    post.mockReturnValue(modelResponse('Housing', 0.13, 'llm'));
    expect(await categorize(txn())).toEqual({ category: 'Housing', source: 'llm', confidence: 0.13 });
  });

  it('shows a person\'s name as the Person category', async () => {
    post.mockReturnValue(modelResponse('Person', 0.8, 'person'));
    expect(await categorize(txn({ merchant: 'ALI RAZA' }))).toEqual({
      category: 'Person',
      source: 'llm',
      confidence: 0.8,
    });
  });

  it('maps a verified-merchant answer to lookup', async () => {
    post.mockReturnValue(modelResponse('Fuel', 0.2, 'historical_lookup'));
    expect(await categorize(txn())).toMatchObject({ category: 'Fuel', source: 'lookup' });
  });

  it('treats a server "unknown" answer as Uncategorized', async () => {
    post.mockReturnValue(modelResponse('Unknown', 0, 'unknown'));
    expect(await categorize(txn())).toEqual({ category: 'Uncategorized', source: 'fallback' });
  });

  it('falls back when the request times out', async () => {
    post.mockRejectedValue(Object.assign(new Error('timeout'), { isAxiosError: true, code: 'ECONNABORTED' }));
    expect(await categorize(txn())).toEqual({ category: 'Uncategorized', source: 'fallback', retry: 'unavailable' });
  });

  it('falls back and marks the row for a retry when the server errors', async () => {
    post.mockRejectedValue(Object.assign(new Error('HTTP 503'), { isAxiosError: true, response: { status: 503 } }));
    expect(await categorize(txn())).toEqual({ category: 'Uncategorized', source: 'fallback', retry: 'unavailable' });
    resetModelClient(); // the 503 started the cooldown
    post.mockRejectedValue(Object.assign(new Error('HTTP 400'), { isAxiosError: true, response: { status: 400 } }));
    expect(await categorize(txn())).toEqual({ category: 'Uncategorized', source: 'fallback', retry: 'rejected' });
  });

  it('labels RAAST/IBFT transfers as Transfers without calling the model', async () => {
    const result = await categorize(txn({ merchant: 'SARA KHAN', raw: 'sent to SARA KHAN of IBAN No via RAAST' }));
    expect(result).toEqual({ category: 'Transfers', source: 'lookup' });
    expect(post).not.toHaveBeenCalled();
  });

  it('does not treat a NayaPay "Retail Payment" paid over Raast as a transfer', async () => {
    const raw = 'Retail Payment Paid to SAWAD RESTAURANT Raast Service Fee Rs. 0 -Rs. 320';
    const result = await categorize(txn({ merchant: 'SAWAD RESTAURANT', raw }));
    expect(result.category).not.toBe('Transfers');
  });

  it('never sends credits to the model', async () => {
    expect(await categorize(txn({ type: 'CREDIT' }))).toEqual({ category: 'Income', source: 'fallback' });
    expect(post).not.toHaveBeenCalled();
  });

  it('skips the model for an empty merchant', async () => {
    expect(await categorize(txn({ merchant: '  ' }))).toEqual({ category: 'Uncategorized', source: 'fallback' });
    expect(await categorize(txn({ merchant: null }))).toEqual({ category: 'Uncategorized', source: 'fallback' });
    expect(post).not.toHaveBeenCalled();
  });
});
