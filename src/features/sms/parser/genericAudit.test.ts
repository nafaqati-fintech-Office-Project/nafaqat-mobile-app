import { describe, expect, it } from 'vitest';

import { parseSms } from './parseSms';

// Audit of the GENERIC path: every sample is sent from an address no bank rule matches,
// so only the generic patterns can parse it. Samples are SYNTHETIC (written from memory of
// common alert styles) until replaced with real or email-derived ones; do not quote the
// resulting accuracy to the client as real-world accuracy.
type Source = 'synthetic' | 'email' | 'real';
type Sample = {
  source: Source;
  body: string;
  // null = must NOT be parsed as a transaction
  expected: { type: 'DEBIT' | 'CREDIT'; amount: string; currency: string; merchant: string | null } | null;
};

const d = (amount: string, currency: string, merchant: string | null) =>
  ({ type: 'DEBIT', amount, currency, merchant }) as const;
const c = (amount: string, currency: string, merchant: string | null) =>
  ({ type: 'CREDIT', amount, currency, merchant }) as const;

const samples: Sample[] = [
  // Pakistan
  { source: 'synthetic', body: 'Rs. 1,250.00 spent at KFC LAHORE on card ending 1234.', expected: d('1250.00', 'PKR', 'KFC LAHORE') },
  { source: 'synthetic', body: 'Your a/c XXXX1234 is debited by Rs 3,500.00 on 26-Oct-26 for POS purchase at CARREFOUR. Avl Bal Rs 20,000.00', expected: d('3500.00', 'PKR', 'CARREFOUR') },
  { source: 'synthetic', body: 'PKR 15,000 has been credited to your account 0123456789 from ALI RAZA via IBFT.', expected: c('15000', 'PKR', 'ALI RAZA') },
  { source: 'synthetic', body: 'Dear Customer, Rs.800 withdrawn from ATM Gulberg using card 5566. Bal Rs.12,000', expected: d('800', 'PKR', null) },
  { source: 'synthetic', body: 'You have sent Rs. 2,000.00 to 03001234567 (AHMED) via Easypaisa. TID 998877.', expected: d('2000.00', 'PKR', '03001234567 (AHMED)') },
  { source: 'synthetic', body: 'You have received Rs. 5,000.00 from SANA KHAN. Your new balance is Rs. 7,250.00.', expected: c('5000.00', 'PKR', 'SANA KHAN') },
  { source: 'synthetic', body: 'Rs. 450 paid to FOODPANDA using JazzCash. TxnID 12345.', expected: d('450', 'PKR', 'FOODPANDA') },
  { source: 'synthetic', body: 'Bill payment of Rs. 6,420.00 to LESCO successful. Ref 5544.', expected: d('6420.00', 'PKR', 'LESCO') },
  { source: 'synthetic', body: 'Mobile top-up of Rs. 500 for 03211234567 successful.', expected: d('500', 'PKR', null) },
  { source: 'synthetic', body: 'Refund of Rs. 1,000.00 from DARAZ.PK has been credited to your account.', expected: c('1000.00', 'PKR', 'DARAZ.PK') },
  { source: 'synthetic', body: 'Salary of PKR 85,000.00 credited to account ending 4455.', expected: c('85000.00', 'PKR', null) },
  { source: 'synthetic', body: 'Cash deposited Rs. 20,000 in your account ending 7788.', expected: c('20000', 'PKR', null) },
  // Saudi Arabia
  { source: 'synthetic', body: 'Purchase SAR 120.50 at JARIR BOOKSTORE, card ending 4455. Balance SAR 3,400.00', expected: d('120.50', 'SAR', 'JARIR BOOKSTORE') },
  { source: 'synthetic', body: 'POS purchase of SAR 89.00 from PANDA on 26/10/2026 via mada card *1122', expected: d('89.00', 'SAR', 'PANDA') },
  { source: 'synthetic', body: 'Deposit SAR 5,000.00 to account ending 3322. Available balance SAR 8,100.00', expected: c('5000.00', 'SAR', null) },
  { source: 'synthetic', body: 'شراء بمبلغ ٢٥٠٫٥٠ ر.س من نون عبر بطاقة مدى ٤٤٣٣', expected: d('250.50', 'SAR', 'نون') },
  { source: 'synthetic', body: 'إيداع مبلغ 3000.00 ريال في حسابك رقم 5566', expected: c('3000.00', 'SAR', null) },
  { source: 'synthetic', body: 'Outgoing transfer of SAR 1,500.00 to MOHAMMED ALI completed.', expected: d('1500.00', 'SAR', 'MOHAMMED ALI') },
  // UAE
  { source: 'synthetic', body: 'AED 75.00 spent at CARREFOUR DUBAI MALL using card ending 9988. Avl bal AED 2,100.00', expected: d('75.00', 'AED', 'CARREFOUR DUBAI MALL') },
  { source: 'synthetic', body: 'Your account has been credited with AED 10,000.00 on 26-Oct-26.', expected: c('10000.00', 'AED', null) },
  { source: 'synthetic', body: 'تم خصم 120 درهم من بطاقتك المنتهية بـ 7766 لدى امازون', expected: d('120', 'AED', 'امازون') },
  // Traps: must not parse
  { source: 'synthetic', body: 'Your OTP is 556677 for payment of Rs. 500 at DARAZ. Do not share.', expected: null },
  { source: 'synthetic', body: 'Get 20% discount on dining! Spend Rs. 2,000 and win. Apply now.', expected: null },
  { source: 'synthetic', body: 'Dear customer, your statement for Oct is ready. Min due Rs. 1,500 by 05-Nov.', expected: null },
  { source: 'synthetic', body: 'Hi, are we meeting at 5pm? I paid for lunch yesterday.', expected: null },
  { source: 'synthetic', body: 'Payment of Rs. 2,500 declined due to insufficient funds.', expected: null },
  { source: 'synthetic', body: 'Your card ending 1234 has been blocked.', expected: null },
];

const ADDRESS = 'ZZ-UNKNOWN';

describe('generic path audit (synthetic samples, no bank rule matches)', () => {
  it('reports per-field accuracy', () => {
    const failures: string[] = [];
    let txnTotal = 0;
    const hit = { type: 0, amount: 0, currency: 0, merchant: 0 };
    let trapTotal = 0;
    let trapOk = 0;

    samples.forEach((s, i) => {
      const got = parseSms({ id: String(i), address: ADDRESS, body: s.body, date: 0 });
      if (s.expected === null) {
        trapTotal++;
        if (got === null) trapOk++;
        else failures.push(`#${i} TRAP parsed as ${got.type} ${got.amount} ${got.currency}: ${s.body}`);
        return;
      }
      txnTotal++;
      if (!got) {
        failures.push(`#${i} MISSED: ${s.body}`);
        return;
      }
      const e = s.expected;
      const bad: string[] = [];
      if (got.type === e.type) hit.type++; else bad.push(`type ${got.type}≠${e.type}`);
      if (got.amount === e.amount) hit.amount++; else bad.push(`amount ${got.amount}≠${e.amount}`);
      if (got.currency === e.currency) hit.currency++; else bad.push(`currency ${got.currency}≠${e.currency}`);
      if (got.merchant === e.merchant) hit.merchant++; else bad.push(`merchant ${JSON.stringify(got.merchant)}≠${JSON.stringify(e.merchant)}`);
      if (bad.length) failures.push(`#${i} ${bad.join('; ')}: ${s.body}`);
    });

    const pct = (n: number, t: number) => `${n}/${t} (${t ? Math.round((n / t) * 100) : 0}%)`;
    console.log(
      [
        `GENERIC AUDIT (${samples.length} samples, ${samples.filter((s) => s.source !== 'synthetic').length} non-synthetic)`,
        `type      ${pct(hit.type, txnTotal)}`,
        `amount    ${pct(hit.amount, txnTotal)}`,
        `currency  ${pct(hit.currency, txnTotal)}`,
        `merchant  ${pct(hit.merchant, txnTotal)}`,
        `non-txn rejected ${pct(trapOk, trapTotal)}`,
        '',
        ...failures,
      ].join('\n'),
    );
    expect(samples.length).toBeGreaterThan(0);
  });
});
