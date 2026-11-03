import { describe, expect, it } from 'vitest';

import { canAddMore, canUse, isPlanFeature, limitOf, monthsFreeYearly, premiumPrice } from './plans';

describe('plans', () => {
  it('keeps paid features off the free plan', () => {
    expect(canUse('free', 'pdfExport')).toBe(false);
    expect(canUse('free', 'assistant')).toBe(false);
    expect(canUse('premium', 'assistant')).toBe(true);
    expect(canUse('free', 'alerts')).toBe(true);
  });

  it('counts a limited feature as included', () => {
    expect(canUse('free', 'budgets')).toBe(true);
    expect(limitOf('free', 'budgets')).toBe(3);
    expect(limitOf('premium', 'budgets')).toBeNull();
    expect(limitOf('free', 'family')).toBe(0);
  });

  it('allows adding up to the limit', () => {
    expect(canAddMore('free', 'goals', 1)).toBe(true);
    expect(canAddMore('free', 'goals', 2)).toBe(false);
    expect(canAddMore('premium', 'goals', 50)).toBe(true);
  });

  it('prices in the user currency and falls back to SAR', () => {
    expect(premiumPrice('PKR')).toEqual({ currency: 'PKR', monthly: '999', yearly: '9999' });
    expect(premiumPrice('USD').currency).toBe('SAR');
    expect(premiumPrice(null).currency).toBe('SAR');
  });

  it('works out the months saved by paying yearly', () => {
    expect(monthsFreeYearly({ monthly: '19', yearly: '190' })).toBe(2);
    expect(monthsFreeYearly({ monthly: '10', yearly: '120' })).toBe(0);
    expect(monthsFreeYearly({ monthly: '0', yearly: '0' })).toBe(0);
  });

  it('recognises feature names from route params', () => {
    expect(isPlanFeature('pdfExport')).toBe(true);
    expect(isPlanFeature('nope')).toBe(false);
    expect(isPlanFeature(undefined)).toBe(false);
  });
});
