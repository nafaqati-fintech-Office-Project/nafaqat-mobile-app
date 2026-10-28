import { describe, expect, it } from 'vitest';

import { displayPercent, mockUsage, toneFromStatus } from './budgetMath';

describe('toneFromStatus', () => {
  it('maps the service usage status', () => {
    expect(toneFromStatus('ON_TRACK')).toBe('ok');
    expect(toneFromStatus('WARNING')).toBe('warning');
    expect(toneFromStatus('EXCEEDED')).toBe('over');
    expect(toneFromStatus(undefined)).toBe('ok');
  });
});

describe('displayPercent', () => {
  it('rounds down like the service', () => {
    expect(displayPercent(79.99)).toBe(79);
    expect(displayPercent(70.83)).toBe(70);
    expect(displayPercent(101.92)).toBe(101);
  });

  it('never shows a negative or broken value', () => {
    expect(displayPercent(-3)).toBe(0);
    expect(displayPercent(Number.NaN)).toBe(0);
  });
});

describe('mockUsage', () => {
  it('uses the service thresholds: warning from 80%, over from 100%', () => {
    expect(mockUsage('790', '1000').tone).toBe('ok');
    expect(mockUsage('800', '1000').tone).toBe('warning');
    expect(mockUsage('1000', '1000').tone).toBe('over');
  });

  it('reports what is left, negative when over', () => {
    expect(mockUsage('4250', '6000')).toEqual({ remaining: '1750', percent: 70, tone: 'ok' });
    expect(mockUsage('1274', '1250').remaining).toBe('-24');
  });

  it('treats a zero limit as nothing used', () => {
    expect(mockUsage('50', '0').percent).toBe(0);
  });
});
