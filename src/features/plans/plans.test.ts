import { describe, expect, it } from 'vitest';

import { canAddMore, canUse, isPlanFeature, limitOf, monthsFreeYearly, premiumPrice } from './plans';

describe('plans', () => {
  it('keeps paid features off the free plan', () => {
    expect(canUse('free', 'pdfExport')).toBe(false);
    expect(canUse('free', 'receiptOcr')).toBe(false);
    expect(canUse('free', 'cardFilter')).toBe(false);
    expect(canUse('free', 'advancedReports')).toBe(false);
    expect(canUse('free', 'family')).toBe(false);
    expect(canUse('premium', 'receiptOcr')).toBe(true);
    expect(canUse('free', 'budgets')).toBe(true);
  });

  it('counts a limited feature as included', () => {
    expect(canUse('free', 'history')).toBe(true);
    expect(limitOf('free', 'history')).toBe(90);
    expect(limitOf('premium', 'history')).toBeNull();
    expect(limitOf('free', 'smsImport')).toBe(50);
    expect(limitOf('free', 'family')).toBe(0);
  });

  it('allows adding up to the limit', () => {
    expect(canAddMore('free', 'smsImport', 49)).toBe(true);
    expect(canAddMore('free', 'smsImport', 50)).toBe(false);
    expect(canAddMore('premium', 'smsImport', 5000)).toBe(true);
    // budgets and goals are not limited on the free plan
    expect(canAddMore('free', 'goals', 500)).toBe(true);
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
