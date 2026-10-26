import { describe, expect, it } from 'vitest';

import { evaluate, samples } from './evaluate';

// Regression guard on the labelled set. Thresholds are floors, not targets: lower them only on purpose.
describe('parser accuracy on the labelled set', () => {
  const dev = evaluate(samples.filter((s) => s.split === 'dev'));
  const holdout = evaluate(samples.filter((s) => s.split === 'holdout'));

  it('has no dev failures', () => {
    expect(dev.failures).toEqual([]);
  });

  it('never turns a negative (OTP, ad, failed, chat) into a transaction', () => {
    expect(dev.negatives.ok).toBe(dev.negatives.total);
    expect(holdout.negatives.ok).toBe(holdout.negatives.total);
  });

  it('reads type, amount and currency on at least 98% of holdout transactions', () => {
    expect(holdout.core.ok / holdout.core.total).toBeGreaterThanOrEqual(0.98);
  });

  it('keeps the set honest: every sample has a source, split and unique id', () => {
    expect(new Set(samples.map((s) => s.id)).size).toBe(samples.length);
    expect(samples.every((s) => s.source && s.split && s.body && s.received)).toBe(true);
  });
});
