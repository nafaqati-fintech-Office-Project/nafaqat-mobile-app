import { describe, expect, it } from 'vitest';

import { parseSms } from './parseSms';
import { smsKind } from '@/features/categorizer/smsKind';

// Real alert templates of a Saudi bank: one labelled field per line.
const parse = (body: string) => parseSms({ id: '1', address: 'AlRajhiBank', body, date: Date.UTC(2026, 0, 31) });

const cases: [string, string, Record<string, unknown> | null][] = [
  ['POS purchase', 'POS Purchase\nAmount 28.72 SAR\nAt Panda Ret\nMada-Atheer *2046\non 01/01/26 at 00:03', { type: 'DEBIT', amount: '28.72', currency: 'SAR', merchant: 'Panda Ret' }],
  ['POS purchase by card', 'POS Purchase\nAmount 131.53 SAR\nAt CARREFOUR\nBy Credit Card **3158 (Apple Pay)\nOn 01/01/26 00:23\nRemaining limit 18742.57 SAR', { type: 'DEBIT', amount: '131.53', merchant: 'CARREFOUR', cardLast4: '3158' }],
  ['online purchase', 'Online Purchase\nAmount 345.00 SAR\nCredit Card ***4821\nAuthorized by FITNESS TIME\nMEMBERSHIP\non 01/01/26 at 05:09\nRemaining limit 53283.37 SAR', { amount: '345.00', merchant: 'FITNESS TIME MEMBERSHIP' }],
  ['online purchase in USD', 'Online Purchase\nAmount 1.58 USD\nFX Fee 0.14 SAR\nConv. rate 3.76\nCredit Card ***7390\nAuthorized by Airalo\non 01/01/26 04:19\nRemaining limit 12683.52 SAR', { amount: '5.94', currency: 'SAR', merchant: 'Airalo' }],
  ['online purchase in AED', 'Online Purchase (Apple Pay)\nFX Fee 1.23 SAR\nConv. rate 1.02\nAmount 52.57 AED\nCredit Card ***4821\nAuthorized by ATLANTIS\nIn ARE\non 12/02/26 11:48\nRemaining limit 54729.51 SAR', { amount: '53.62', currency: 'SAR', merchant: 'ATLANTIS' }],
  ['transfer to a business', 'Outgoing IPS local transfer\nFrom:*5512\nTo:DAR ALSAKAN REAL ESTATE\nAmount:15000.25 SAR\nBy:AL RAJHI BANK\nIBAN:*8830\nOn:01/01/26 11:04', { type: 'DEBIT', amount: '15000.25', merchant: 'DAR ALSAKAN REAL ESTATE' }],
  ['internal transfer to a person', 'Debit Transfer Internal\nAmount 2500 SAR\nBeneficiary FAISAL M. ALHARBI\nTo *7714\nOn 28/01/26 20:28', { type: 'DEBIT', merchant: 'FAISAL M. ALHARBI' }],
  ['incoming transfer', 'Credit Transfer Local\nAmount 4684.94 SAR\nRemitter GULF DIGITAL SERVICES\nEST\nFrom *9440\nTo *5512\nVia RIYAD BANK\non12/01/26 at 10:00', { type: 'CREDIT', amount: '4684.94', merchant: 'GULF DIGITAL SERVICES EST' }],
  ['refund', 'Refund\nAmount 57.72 SAR\nFrom Credit Card **7390\non 27/01/26 at 00:08\nRemaining limit 10445.54 SAR', { type: 'CREDIT', amount: '57.72' }],
  ['reversed USD purchase', 'Reverse Transaction\nCredit Card **7390\nAmount 1.58 USD\nAt AIRALO\nDate 01/01/26 04:21\nRemaining limit 12689.60 SAR', { type: 'CREDIT', amount: '5.93', merchant: 'AIRALO' }],
  ['own credit card payment', 'Credit Card payment\nFrom account *5512\nTo card **4821\nAmount 6501.14 SAR\nOn 13/01/26 17:45\nRemaining limit 54048.40 SAR', { type: 'DEBIT', amount: '6501.14' }],
  ['SADAD bill', 'Bill Payment\nAmount 361.31 SAR\nFrom 220*512\nBiller 044\nBill 590001234\nDate 05/01/26 18:14', { type: 'DEBIT', amount: '361.31', merchant: null }],
  ['traffic fine', 'MOI Payments\nFrom 220*512\nAmount 300 SAR\nProvider Traffic Violations\nService Query Traffic Violations by\nthe violator ID\nBill number 2479067382\nDate 09/03/26 19:07', { type: 'DEBIT', amount: '300' }],
  ['ATM withdrawal', 'ATM Withdrawal\nAmount SAR 200\nMada card *2046\nAt PRINCE SULTAN ST KHOBAR SA\nOn 04/01/26 19:13', { type: 'DEBIT', amount: '200', merchant: null }],
  ['OTP', 'Your One time Password is 6791\nFor internet purchase USD 1.58\nFrom AIRALO\nusing card ending *7390\nDate 01/01/2026 04:18', null],
  ['statement notice', 'Your Credit Card **4821 E-\nstatement has been issued.\nTotal Amt Due 11005.68 SAR\nDue Amount 550.28 SAR\nDue Date 05/02/2026', null],
];

describe('Saudi bank alerts', () => {
  it.each(cases)('%s', (_name, body, expected) => {
    const txn = parse(body);
    if (expected === null) expect(txn).toBeNull();
    else expect(txn).toMatchObject(expected);
  });

  it('is recognised by wording for the rules that need no merchant', () => {
    expect(smsKind(cases[10]![1])).toBe('internal');
    expect(smsKind(cases[11]![1])).toBe('bill');
    expect(smsKind(cases[12]![1])).toBe('fine');
    expect(smsKind(cases[13]![1])).toBe('atm');
    expect(smsKind(cases[6]![1])).toBe('transfer');
    expect(smsKind(cases[9]![1])).toBe('refund');
  });
});
