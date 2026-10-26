import { describe, expect, it } from 'vitest';

import { parseSms } from './parseSms';

type Expected = {
  bank?: string;
  type: 'DEBIT' | 'CREDIT';
  amount: string;
  currency: string;
  merchant: string | null;
  cardLast4: string | null;
};

type Fixture = { name: string; address: string; body: string; expected: Expected | null };

const fixtures: Fixture[] = [
  {
    name: 'Meezan debit',
    address: 'MEEZAN',
    body: 'Meezan Card ending 1234: purchase of Rs. 1,250.00 at KFC LAHORE on 12-May-26.',
    expected: { bank: 'Meezan', type: 'DEBIT', amount: '1250.00', currency: 'PKR', merchant: 'KFC LAHORE', cardLast4: '1234' },
  },
  {
    name: 'Meezan credit',
    address: 'MEEZAN',
    body: 'Rs. 25,000.00 has been credited to your Meezan account ending 5678 from ALI RAZA.',
    expected: { bank: 'Meezan', type: 'CREDIT', amount: '25000.00', currency: 'PKR', merchant: 'ALI RAZA', cardLast4: '5678' },
  },
  { name: 'Meezan OTP', address: 'MEEZAN', body: 'Your Meezan OTP is 482913. Do not share it with anyone.', expected: null },
  {
    name: 'HBL debit',
    address: 'HBL',
    body: 'HBL: Rs.3,200.00 spent on card ending 4321 at DARAZ.PK on 15/05/2026.',
    expected: { bank: 'HBL', type: 'DEBIT', amount: '3200.00', currency: 'PKR', merchant: 'DARAZ.PK', cardLast4: '4321' },
  },
  {
    name: 'HBL credit',
    address: 'HBL',
    body: 'HBL: Rs.10,000.00 credited in your a/c 0012345678 from JAVED via IBFT.',
    expected: { bank: 'HBL', type: 'CREDIT', amount: '10000.00', currency: 'PKR', merchant: 'JAVED', cardLast4: '5678' },
  },
  {
    name: 'HBL OTP',
    address: 'HBL',
    body: 'HBL: 556677 is your one time verification code for online purchase of Rs. 500. Do not share.',
    expected: null,
  },
  {
    name: 'UBL debit',
    address: 'UBL',
    body: 'UBL: PKR 4,500.00 debited from A/C **8890 for POS purchase at SHELL PETROL. Bal PKR 9,000.00',
    expected: { bank: 'UBL', type: 'DEBIT', amount: '4500.00', currency: 'PKR', merchant: 'SHELL PETROL', cardLast4: '8890' },
  },
  {
    name: 'UBL credit',
    address: 'UBL',
    body: 'UBL: PKR 15,000.00 credited to A/C **8890 from SANA KHAN.',
    expected: { bank: 'UBL', type: 'CREDIT', amount: '15000.00', currency: 'PKR', merchant: 'SANA KHAN', cardLast4: '8890' },
  },
  { name: 'UBL OTP', address: 'UBL', body: 'UBL Digital: Your OTP for login is 123456. Valid for 5 minutes.', expected: null },
  {
    name: 'ABL debit',
    address: 'myABL',
    body: 'ABL: Rs 799.00 paid via myABL to FOODPANDA. Ref 123456.',
    expected: { bank: 'ABL', type: 'DEBIT', amount: '799.00', currency: 'PKR', merchant: 'FOODPANDA', cardLast4: null },
  },
  {
    name: 'ABL credit',
    address: 'ABL',
    body: 'ABL: Rs 5,000 received in A/C ending 7766 from AHMED.',
    expected: { bank: 'ABL', type: 'CREDIT', amount: '5000', currency: 'PKR', merchant: 'AHMED', cardLast4: '7766' },
  },
  { name: 'ABL OTP', address: 'ABL', body: 'ABL: Use code 998877 to verify your transaction.', expected: null },
  {
    name: 'NayaPay debit',
    address: 'NayaPay',
    body: 'You sent Rs. 1,000 to ALI HASSAN. Your NayaPay balance is Rs. 4,000.',
    expected: { bank: 'NayaPay', type: 'DEBIT', amount: '1000', currency: 'PKR', merchant: 'ALI HASSAN', cardLast4: null },
  },
  {
    name: 'NayaPay credit',
    address: 'NayaPay',
    body: 'You received Rs. 2,500 from SARA AHMED on NayaPay.',
    expected: { bank: 'NayaPay', type: 'CREDIT', amount: '2500', currency: 'PKR', merchant: 'SARA AHMED', cardLast4: null },
  },
  { name: 'NayaPay OTP', address: 'NayaPay', body: 'Your NayaPay verification code is 4421.', expected: null },
  {
    name: 'Alinma debit',
    address: 'Alinma',
    body: 'Alinma: Purchase SAR 85.50 at JARIR BOOKSTORE card **1122 on 2026-05-12',
    expected: { bank: 'Alinma', type: 'DEBIT', amount: '85.50', currency: 'SAR', merchant: 'JARIR BOOKSTORE', cardLast4: '1122' },
  },
  {
    name: 'Alinma credit',
    address: 'Alinma',
    body: 'Alinma: Deposit SAR 3,000.00 to account **1122',
    expected: { bank: 'Alinma', type: 'CREDIT', amount: '3000.00', currency: 'SAR', merchant: null, cardLast4: '1122' },
  },
  {
    name: 'Alinma Arabic debit',
    address: 'Alinma',
    body: 'إنماء: شراء بمبلغ 85.50 ر.س من JARIR',
    expected: { bank: 'Alinma', type: 'DEBIT', amount: '85.50', currency: 'SAR', merchant: 'JARIR', cardLast4: null },
  },
  { name: 'Alinma OTP', address: 'Alinma', body: 'Alinma: your OTP is 3344', expected: null },
  { name: 'Alinma Arabic OTP', address: 'Alinma', body: 'رمز التحقق الخاص بك هو 5566', expected: null },
  {
    name: 'Al Rajhi debit',
    address: 'AlRajhi',
    body: 'Al Rajhi: POS purchase SAR 120.00 at PANDA HYPERMARKET card ending 3344 on 12/05/26',
    expected: { bank: 'Al Rajhi', type: 'DEBIT', amount: '120.00', currency: 'SAR', merchant: 'PANDA HYPERMARKET', cardLast4: '3344' },
  },
  {
    name: 'Al Rajhi credit',
    address: 'AlRajhi',
    body: 'Al Rajhi: SAR 5,000.00 credited to your account ending 3344 from ACME CO.',
    expected: { bank: 'Al Rajhi', type: 'CREDIT', amount: '5000.00', currency: 'SAR', merchant: 'ACME CO', cardLast4: '3344' },
  },
  {
    name: 'Al Rajhi Arabic-Indic digits',
    address: 'AlRajhi',
    body: 'الراجحي: إيداع مبلغ ٥٬٠٠٠٫٠٠ ر.س في حسابك',
    expected: { bank: 'Al Rajhi', type: 'CREDIT', amount: '5000.00', currency: 'SAR', merchant: null, cardLast4: null },
  },
  {
    name: 'Al Rajhi OTP',
    address: 'AlRajhi',
    body: 'Al Rajhi: OTP 778899 for your transfer of SAR 500. Never share.',
    expected: null,
  },
  {
    name: 'SNB debit',
    address: 'SNB',
    body: 'SNB: Purchase of SAR 59.00 from NOON via card ending 7788.',
    expected: { bank: 'SNB', type: 'DEBIT', amount: '59.00', currency: 'SAR', merchant: 'NOON', cardLast4: '7788' },
  },
  {
    name: 'SNB credit',
    address: 'SNB',
    body: 'SNB: SAR 8,000.00 deposited to your account ending 9900.',
    expected: { bank: 'SNB', type: 'CREDIT', amount: '8000.00', currency: 'SAR', merchant: null, cardLast4: '9900' },
  },
  { name: 'SNB OTP', address: 'SNB', body: 'SNB: Your verification code is 112233.', expected: null },
  {
    name: 'Emirates NBD debit',
    address: 'ENBD',
    body: 'Emirates NBD: AED 245.75 spent on your card ending 5566 at CARREFOUR DUBAI on 12-May-2026.',
    expected: { bank: 'Emirates NBD', type: 'DEBIT', amount: '245.75', currency: 'AED', merchant: 'CARREFOUR DUBAI', cardLast4: '5566' },
  },
  {
    name: 'Emirates NBD credit',
    address: 'ENBD',
    body: 'Emirates NBD: AED 12,000.00 credited to your account ending 4433 from ACME LLC.',
    expected: { bank: 'Emirates NBD', type: 'CREDIT', amount: '12000.00', currency: 'AED', merchant: 'ACME LLC', cardLast4: '4433' },
  },
  {
    name: 'Emirates NBD OTP',
    address: 'ENBD',
    body: 'Emirates NBD OTP: 903211 to authorize AED 245.75 payment.',
    expected: null,
  },
  {
    name: 'generic debit, unknown sender',
    address: 'AD-BANKX',
    body: 'Rs 500 debited from your account ending 1234 at AMAZON on 01-05-26',
    expected: { bank: 'AD-BANKX', type: 'DEBIT', amount: '500', currency: 'PKR', merchant: 'AMAZON', cardLast4: '1234' },
  },
  {
    name: 'generic currency after amount, comma amount',
    address: 'BANKY',
    body: 'Debited 1,234.50 SAR for purchase at STORE',
    expected: { bank: 'BANKY', type: 'DEBIT', amount: '1234.50', currency: 'SAR', merchant: 'STORE', cardLast4: null },
  },
  {
    name: 'generic Arabic digits',
    address: 'BANKZ',
    body: 'خصم ٢٥٠٫٥٠ ر.س شراء',
    expected: { bank: 'BANKZ', type: 'DEBIT', amount: '250.50', currency: 'SAR', merchant: null, cardLast4: null },
  },
  {
    name: 'generic POS keyword only',
    address: 'XBANK',
    body: 'POS txn Rs 450.00 at FOODCO card ending 2211',
    expected: { bank: 'XBANK', type: 'DEBIT', amount: '450.00', currency: 'PKR', merchant: 'FOODCO', cardLast4: '2211' },
  },
  {
    name: 'time after "at" is not a merchant',
    address: 'BANKT',
    body: 'Rs 500 debited at 12:26:33 from your account ending 1234',
    expected: { bank: 'BANKT', type: 'DEBIT', amount: '500', currency: 'PKR', merchant: null, cardLast4: '1234' },
  },
  {
    name: 'merchant after a time',
    address: 'BANKT',
    body: 'Rs 500 spent at 12:26:33 at STORE X on 01-05-26',
    expected: { bank: 'BANKT', type: 'DEBIT', amount: '500', currency: 'PKR', merchant: 'STORE X', cardLast4: null },
  },
  {
    name: 'RAAST transfer to a person',
    address: '8558',
    body: 'Dear AHMED ALI, an amount of Rs. 1,500 has been successfully sent to SARA KHAN of IBAN No: ****1234 on 2026-05-12 at 12:26:33. TID:123456789012 via RAAST',
    expected: { bank: '8558', type: 'DEBIT', amount: '1500', currency: 'PKR', merchant: 'SARA KHAN', cardLast4: '1234' },
  },
  { name: 'balance only', address: 'BANKY', body: 'Your available balance is Rs. 5,000.00', expected: null },
  {
    name: 'promo',
    address: 'BANKY',
    body: 'Dear Customer, apply now and get 20% discount on spending Rs. 5,000.',
    expected: null,
  },
  { name: 'no amount', address: 'BANKY', body: 'Your card ending 1234 was used for purchase', expected: null },
  { name: 'empty body', address: '', body: '', expected: null },
];

describe('parseSms', () => {
  it.each(fixtures)('$name', ({ address, body, expected }) => {
    const result = parseSms({ id: 'sms-1', address, body, date: 1_700_000_000_000 });
    if (!expected) {
      expect(result).toBeNull();
      return;
    }
    expect(result).toMatchObject({ smsId: 'sms-1', date: 1_700_000_000_000, raw: body, ...expected });
  });

  it('never throws on odd input', () => {
    const odd = { id: '1', address: 'X', body: 'Rs '.repeat(5000), date: 0 };
    expect(() => parseSms(odd)).not.toThrow();
  });
});
