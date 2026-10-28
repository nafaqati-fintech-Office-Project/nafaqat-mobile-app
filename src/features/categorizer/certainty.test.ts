import { describe, expect, it, vi } from 'vitest';

import { certaintyOf, LOW_CONFIDENCE } from './certainty';

// certainty.ts only needs the Uncategorized label; keep the model client and its api client out.
vi.mock('./modelClient', () => ({}));

describe('certaintyOf', () => {
  it('asks the user to pick when nothing named a category', () => {
    expect(certaintyOf({ category: 'Uncategorized', source: 'fallback' })).toBe('uncategorized');
    expect(certaintyOf({ category: 'Uncategorized', source: 'fallback', confidence: 0 })).toBe('uncategorized');
  });

  it('marks an ML answer below the server threshold as unsure', () => {
    expect(LOW_CONFIDENCE).toBe(0.7);
    expect(certaintyOf({ category: 'Health', source: 'model', confidence: 0.69 })).toBe('unsure');
    expect(certaintyOf({ category: 'Health', source: 'model', confidence: 0.7 })).toBe('confident');
    expect(certaintyOf({ category: 'Health', source: 'model', confidence: 0.95 })).toBe('confident');
  });

  it('trusts Gemini, the merchant lists and the rules whatever number was stored with them', () => {
    expect(certaintyOf({ category: 'Housing', source: 'llm', confidence: 0.13 })).toBe('confident');
    expect(certaintyOf({ category: 'Person', source: 'llm', confidence: 0.8 })).toBe('confident');
    expect(certaintyOf({ category: 'Fuel', source: 'lookup', confidence: 0.2 })).toBe('confident');
    expect(certaintyOf({ category: 'Food & Beverage', source: 'lookup', confidence: null })).toBe('confident');
    expect(certaintyOf({ category: 'Income', source: 'fallback' })).toBe('confident');
  });

  it('trusts an ML answer stored without a number', () => {
    expect(certaintyOf({ category: 'Health', source: 'model', confidence: null })).toBe('confident');
  });
});
