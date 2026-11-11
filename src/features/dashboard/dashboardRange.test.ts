import { describe, expect, it } from 'vitest';

import { isEmptyDashboard, WIDER_RANGE } from './dashboardRange';

const data = (totalSpending: string, transactionCount: number, income: string) => ({
  totalSpending,
  transactionCount,
  cashFlow: { income, expenses: totalSpending, net: '0', savingsRate: null },
});

describe('isEmptyDashboard', () => {
  it('is empty when nothing came in or went out', () => {
    expect(isEmptyDashboard(data('0.00', 0, '0.00'))).toBe(true);
  });

  it('is not empty with spending, with a transaction, or with income only', () => {
    expect(isEmptyDashboard(data('120.50', 3, '0.00'))).toBe(false);
    expect(isEmptyDashboard(data('0.00', 1, '0.00'))).toBe(false);
    expect(isEmptyDashboard(data('0.00', 0, '5000.00'))).toBe(false);
  });
});

describe('WIDER_RANGE', () => {
  it('widens 1 to 3 to 6 to 12 months and stops there', () => {
    expect(WIDER_RANGE[1]).toBe(3);
    expect(WIDER_RANGE[3]).toBe(6);
    expect(WIDER_RANGE[6]).toBe(12);
    expect(WIDER_RANGE[12]).toBeUndefined();
  });
});
