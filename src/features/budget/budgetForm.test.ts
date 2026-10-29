import { describe, expect, it } from 'vitest';

import { checkBudgetForm, fromMinor, readAmount } from './budgetForm';

describe('readAmount', () => {
  it('reads whole and decimal amounts in minor units', () => {
    expect(readAmount('1500', 'PKR')).toEqual({ kind: 'ok', amount: '1500.00', minor: 150000 });
    expect(readAmount(' 12.5 ', 'SAR')).toEqual({ kind: 'ok', amount: '12.50', minor: 1250 });
    expect(readAmount('0.125', 'KWD')).toEqual({ kind: 'ok', amount: '0.125', minor: 125 });
  });

  it('accepts Arabic digits and a comma or Arabic decimal mark', () => {
    expect(readAmount('١٥٠٠٫٧٥', 'SAR')).toMatchObject({ kind: 'ok', amount: '1500.75' });
    expect(readAmount('۲۰,۵', 'AED')).toMatchObject({ kind: 'ok', amount: '20.50' });
  });

  it('refuses zero, too many decimals, signs, letters and huge numbers', () => {
    expect(readAmount('', 'PKR')).toEqual({ kind: 'empty' });
    for (const text of ['0', '0.00', '12.345', '-5', '1e3', 'abc', '1.2.3', '1234567890123']) {
      expect(readAmount(text, 'PKR'), text).toEqual({ kind: 'invalid' });
    }
    expect(readAmount('1.234', 'BHD')).toMatchObject({ kind: 'ok' });
  });
});

describe('checkBudgetForm', () => {
  it('builds the body with category codes and skips empty categories', () => {
    const check = checkBudgetForm('5000', { Groceries: '1500', Fuel: '', 'Food & Beverage': '800.5' }, 'SAR');
    expect(check.body).toEqual({
      totalLimit: 5000,
      categoryLimits: [
        { category: 'GROCERIES', limitAmount: 1500 },
        { category: 'FOOD_AND_BEVERAGE', limitAmount: 800.5 },
      ],
    });
    expect(check.allocatedMinor).toBe(230050);
    expect(check.overTotal).toBe(false);
  });

  it('stops when the categories add up to more than the total, exactly in minor units', () => {
    expect(checkBudgetForm('100', { Groceries: '60', Fuel: '40' }, 'SAR').body).not.toBeNull();
    const over = checkBudgetForm('100', { Groceries: '60', Fuel: '40.01' }, 'SAR');
    expect(over).toMatchObject({ overTotal: true, body: null, allocatedMinor: 10001, totalMinor: 10000 });
  });

  it('reports a missing or bad total and bad category amounts', () => {
    expect(checkBudgetForm('', {}, 'PKR')).toMatchObject({ totalError: 'required', body: null });
    expect(checkBudgetForm('abc', {}, 'PKR')).toMatchObject({ totalError: 'invalid', body: null });
    expect(checkBudgetForm('100', { Groceries: '1.234' }, 'PKR')).toMatchObject({
      invalidCategories: ['Groceries'],
      body: null,
    });
  });
});

describe('fromMinor', () => {
  it('turns minor units back into a decimal string', () => {
    expect(fromMinor(150050, 'SAR')).toBe('1500.50');
    expect(fromMinor(5, 'KWD')).toBe('0.005');
    expect(fromMinor(-1, 'PKR')).toBe('-0.01');
  });
});
