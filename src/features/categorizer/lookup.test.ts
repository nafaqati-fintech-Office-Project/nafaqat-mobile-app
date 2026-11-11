import { describe, expect, it } from 'vitest';

import { lookupCategory } from './lookup';

describe('lookupCategory', () => {
  it('puts a bare PTCL or Transworld payment under Utilities', () => {
    expect(lookupCategory('PTCL')).toBe('Utilities');
    expect(lookupCategory('TRANSWORLD HOME')).toBe('Utilities');
  });

  it('keeps the longer, more specific pattern', () => {
    expect(lookupCategory('PTCL TV')).toBe('Subscriptions');
  });
});
