import { describe, expect, it } from 'vitest';

import { parseSms } from './parseSms';

const RECEIVED = new Date(2023, 6, 14, 17, 0).getTime();
const parse = (body: string) => parseSms({ id: '1', address: 'ZZ-UNKNOWN', body, date: RECEIVED });

describe('card digits', () => {
  it.each([
    ['Trx. of AED17.75 on your card ending *121 at STARBUCKS, UAE is Approved. Avl. card bal is 14241.55.', '121'],
    ['Trx. of AED2.97 on your card ending *944 at SAVEWAY, UAE is Approved. Avl. card bal is 610.93.', '944'],
    ['Transaction of AED 22.00 debited from your a/c ****0535 at BROCCLI PIZZA. Avl Bal is AED 44.44', '0535'],
    ['Trx. of AED 10.00 on your card ending **0121 at TEA JUNCTION, UAE is Approved.', '0121'],
    ['Your HBL A/C 1258 ***** 69499 has been debited with PKR 208.8 on 04/11/2024.', '9499'],
    ['Debit of PKR 1,050.00 in Account No: 0040****780011 at PSO.', '0011'],
    ['Meezan Card ending 1234: purchase of Rs. 1,250.00 at KFC.', '1234'],
    ['HBL: Rs.10,000.00 credited in your a/c 0012345678 from JAVED via IBFT.', '5678'],
  ])('reads the tail from %s', (body, expected) => {
    expect(parse(body)?.cardLast4).toBe(expected);
  });

  it('never reads a balance or amount as card digits', () => {
    expect(parse('Dear Customer, AED 10.00 was debited. Your available account balance is AED 64.71')?.cardLast4).toBeNull();
  });
});

describe('merchant clean-up', () => {
  it('drops the city and country the card network appends', () => {
    expect(parse('Trx. of AED 10.00 on your card ending **0121 at TEA JUNCTION EXPRESS in ABU DHABI, UNITED ARAB EMI is Approved.')?.merchant).toBe('TEA JUNCTION EXPRESS');
    expect(parse('Transaction of AED 8.00 debited from your a/c ****0535 at SOME SHOP DUBAI AE. Avl Bal is AED 3288.70')?.merchant).toBe('SOME SHOP DUBAI');
  });
});

describe('UAE card formats', () => {
  it('reads an "is Approved" card purchase with balance and date', () => {
    const txn = parse('Trx. of AED17.75 on your card ending *121 at STARBUCKS ADNOC , UAE is Approved. Avl. card bal is 14241.55. Trx Date: 14/07/23 16:57');
    expect(txn).toMatchObject({ type: 'DEBIT', amount: '17.75', currency: 'AED', merchant: 'STARBUCKS ADNOC', balance: '14241.55' });
    expect(txn?.txnDate).toBe(new Date(2023, 6, 14, 16, 57).getTime());
  });

  it('reads a month-first date when the day cannot be the first number', () => {
    const txn = parseSms({ id: '1', address: 'X', date: new Date(2020, 6, 29, 20, 0).getTime(), body: 'Trx. of AED 451.20 on your card ending **0121 at LuluHypermarket KHALID on 7/29/2020 for payment.' });
    expect(txn?.txnDate).toBe(new Date(2020, 6, 29).getTime());
  });

  it('treats a reversed purchase as money back', () => {
    expect(parse('A POS Trxn on your Account No ****1234 at ADNOC AL MAFRAQ, ABU DHABI in AE on 7/14/2023 for AED 50.00 is reversed.')?.type).toBe('CREDIT');
  });

  it('ignores rejected transactions, OTPs and statement reminders', () => {
    expect(parse('Trx. for Covered Card ending *1234 at TALABAT, UAE on 7/14/2023 for AED10.00 has been rejected due to insufficient balance')).toBeNull();
    expect(parse('Please do not share your OTP with anyone. One-Time-Password for Online Trx Etisalat Digital AE for AED 10.00 using card')).toBeNull();
    expect(parse('ADIB Covered card Mini stmt. Total amount due AED 120.00 on card ending 1234. Min due AED 50 by 5FEB. Please pay before due date.')).toBeNull();
  });
});
