import { describe, expect, it } from 'vitest';

import { parseReceipt, receiptDay } from './parseReceipt';

describe('parseReceipt', () => {
  it('reads a full answer', () => {
    expect(
      parseReceipt({ receipt: { amount: '42.50', currency: 'SAR', merchant: ' Panda ', date: '2026-10-01', category: 'Groceries' } }),
    ).toEqual({ amount: '42.50', currency: 'SAR', merchant: 'Panda', date: '2026-10-01', category: 'Groceries' });
  });

  it('keeps the amount when the rest is missing or unusable', () => {
    expect(parseReceipt({ receipt: { amount: '10.00', currency: 'XYZ', merchant: null, date: '2026-02-31', category: '' } })).toEqual({
      amount: '10.00',
      currency: null,
      merchant: null,
      date: null,
      category: null,
    });
  });

  it('keeps a dollar receipt so it can be converted', () => {
    expect(parseReceipt({ receipt: { amount: '9.99', currency: 'USD' } })?.currency).toBe('USD');
  });

  it('gives null without a usable total', () => {
    for (const body of [null, {}, { receipt: null }, { receipt: { amount: null } }, { receipt: { amount: '0.00' } }, { receipt: { amount: 'abc' } }, { receipt: { amount: 12 } }]) {
      expect(parseReceipt(body)).toBeNull();
    }
  });
});

describe('receiptDay', () => {
  it('gives local midnight of a real day', () => {
    expect(receiptDay('2026-10-01')).toEqual(new Date(2026, 9, 1));
  });

  it('rejects other text and days that do not exist', () => {
    expect(receiptDay('01/10/2026')).toBeNull();
    expect(receiptDay('2026-13-01')).toBeNull();
    expect(receiptDay(undefined)).toBeNull();
  });
});
