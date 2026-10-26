import { describe, expect, it } from 'vitest';

import { parseSms } from './parseSms';

const RECEIVED = new Date(2026, 9, 26, 15, 0).getTime(); // 26 Oct 2026 15:00 local
const parse = (body: string) => parseSms({ id: '1', address: 'ZZ-UNKNOWN', body, date: RECEIVED });
const day = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min).getTime();

describe('balance extraction', () => {
  it.each([
    ['Rs 3,500.00 debited at CARREFOUR. Avl Bal Rs 20,000.00', '20000.00'],
    ['PKR 4,500.00 debited at SHELL. Bal PKR 9,000.00', '9000.00'],
    ['You have received Rs. 5,000.00 from SANA KHAN. Your new balance is Rs. 7,250.00.', '7250.00'],
    ['Deposit SAR 5,000.00 to account. Available balance SAR 8,100.00', '8100.00'],
    ['Rs.800 withdrawn from ATM using card 5566. Bal Rs.12,000', '12000'],
    ['شراء بمبلغ 250.50 ر.س من نون. الرصيد 3,400.00 ر.س', '3400.00'],
  ])('reads balance from %s', (body, balance) => {
    expect(parse(body)?.balance).toBe(balance);
  });

  it('is null when the SMS has no balance', () => {
    expect(parse('Rs. 1,250.00 spent at KFC LAHORE on card ending 1234.')?.balance).toBeNull();
  });
});

describe('transaction date extraction', () => {
  it.each([
    ['Rs. 100 spent at KFC on 12-May-26.', day(2026, 5, 12)],
    ['Rs. 100 spent at KFC on 15/05/2026.', day(2026, 5, 15)],
    ['Rs. 100 spent at KFC on 2026-10-25.', day(2026, 10, 25)],
    ['Rs. 100 spent at KFC on 25 Oct 2026 at 14:30.', day(2026, 10, 25, 14, 30)],
    ['Rs. 100 spent at KFC on 25-10-2026 08:15 PM.', day(2026, 10, 25, 20, 15)],
  ])('reads date from %s', (body, expected) => {
    expect(parse(body)?.txnDate).toBe(expected);
  });

  it('is null when the SMS has no date', () => {
    expect(parse('Rs. 1,250.00 spent at KFC LAHORE.')?.txnDate).toBeNull();
  });

  it('ignores impossible, future and stale dates', () => {
    expect(parse('Rs. 100 spent at KFC on 31/02/2026.')?.txnDate).toBeNull();
    expect(parse('Rs. 100 spent at KFC. Next due 05-Nov-26.')?.txnDate).toBeNull();
    expect(parse('Rs. 100 spent at KFC on 01/01/2020.')?.txnDate).toBeNull();
  });

  it('does not mistake an amount for a date', () => {
    expect(parse('Rs. 12.50.20 spent at KFC.')?.txnDate).toBeNull();
  });
});
