import { describe, expect, it } from 'vitest';

import { parseSms } from './parseSms';

// Audit against REAL alert text collected from bank emails and app screenshots (source: 'email'
// for emails flattened to one line, 'app' for in-app receipts). Account holder and counterparty
// names are replaced with placeholders; merchants, amounts, dates and wording are as received.
// These are NOT SMS-exact: layout and labels may differ from the SMS a bank sends.
type Expected = {
  type: 'DEBIT' | 'CREDIT';
  amount: string;
  currency: string;
  merchant: string | null;
  txnDate?: [number, number, number, number, number]; // y, m, d, h, min
};
type Sample = { bank: string; address: string; body: string; expected: Expected | null; note?: string };

const samples: Sample[] = [
  {
    bank: 'Allied',
    address: 'ABL',
    body: 'PKR 49,500.00 has been received in your Account No: ***0011 on Sunday , 25-Oct-2026 at 10:18 PM. Transaction Description : RAAST Transfer Sender Name : ALI KHAN Sender Account : ***4327',
    expected: { type: 'CREDIT', amount: '49500.00', currency: 'PKR', merchant: null, txnDate: [2026, 10, 25, 22, 18] },
  },
  {
    bank: 'Allied',
    address: 'ABL',
    body: 'A Debit transaction of PKR 1,050.00 was made in your Account No: 0000****123456 (ALI KHAN) in FARID GATE, BAHAWALPUR branch on Friday, 23 Oct 2026 at  6:40PM. Transaction description : PURCHASE PSO SS 95 RIYASAT 1208LAHORE PK Instrument / Cheque# : Hide By Me',
    expected: { type: 'DEBIT', amount: '1050.00', currency: 'PKR', merchant: 'PSO SS 95 RIYASAT 1208LAHORE', txnDate: [2026, 10, 23, 18, 40] },
  },
  {
    bank: 'Allied',
    address: 'ABL',
    body: 'A Debit transaction of PKR 1,000.00 was made in your Account No: 0000****123456 (ALI KHAN) in FARID GATE, BAHAWALPUR branch on Tuesday, 20 Oct 2026 at  12:26AM. Transaction description : PURCHASE PSO SPEEDWAY LAHORE PBPK Instrument / Cheque# : Hide By Me',
    expected: { type: 'DEBIT', amount: '1000.00', currency: 'PKR', merchant: 'PSO SPEEDWAY LAHORE PBPK', txnDate: [2026, 10, 20, 0, 26] },
  },
  {
    bank: 'NayaPay',
    address: 'NayaPay',
    body: 'Your retail transaction was successful JB TRADERS Retail Transaction 26 Oct 2026, 01:19 PM - Rs. 20 AMOUNT DETAILS Transaction Amount Rs. 20 Service Fee (Incl. Tax) Rs. 0 Total Amount Rs. 20 TRANSACTION DETAILS Transaction ID 6adf0d111943563341d7eb02 ADDITIONAL INFORMATION Type of Transaction Retail Merchant Category Book Stores Merchant Details JB TRADERS Channel Raast',
    expected: { type: 'DEBIT', amount: '20', currency: 'PKR', merchant: 'JB TRADERS', txnDate: [2026, 10, 26, 13, 19] },
    note: 'in-app receipt',
  },
  {
    bank: 'NayaPay',
    address: 'NayaPay',
    body: 'AMOUNT DETAILS Amount Received Rs. 4,300 Service Fee (Incl. Tax) Rs. 0 Total Amount Rs. 4,300 TRANSACTION DETAILS Transaction ID 31792948752256680210361394 ADDITIONAL INFORMATION Source Acc. Title ALI KHAN Source Bank JazzCash - Mobilink Microfinance Bank Raast ID / IBAN ●●●●4400 Destination Acc. Title ALI KHAN Channel Raast',
    expected: { type: 'CREDIT', amount: '4300', currency: 'PKR', merchant: null },
    note: 'in-app receipt',
  },
  {
    bank: 'NayaPay',
    address: 'NayaPay',
    body: 'AMOUNT DETAILS Amount Sent Rs. 900 Service Fee (Incl. Tax) Rs. 0 Total Amount Rs. 900 TRANSACTION DETAILS Transaction ID 6ade3df51943563341ce89fb ADDITIONAL INFORMATION Destination Acc. Title Butt G Fast Foo Destination Bank Habib Bank Destination Acc. Number ●●●●6803 Source Acc. Title ALI KHAN Channel Raast',
    expected: { type: 'DEBIT', amount: '900', currency: 'PKR', merchant: 'Butt G Fast Foo' },
    note: 'in-app receipt; destination title is a food shop',
  },
  {
    bank: 'JazzCash',
    address: 'JazzCash',
    body: 'Dear ALI KHAN, an amount of Rs. 290 has been successfully sent to SYED IJAZ AHMED of IBAN No: ****4400 on 2026-10-05 at 14:39:17. TID:726176444628 via RAAST',
    expected: { type: 'DEBIT', amount: '290', currency: 'PKR', merchant: 'SYED IJAZ AHMED', txnDate: [2026, 10, 5, 14, 39] },
  },
  {
    bank: 'JazzCash',
    address: 'JazzCash',
    body: 'Dear ALI KHAN, an amount of Rs. 100 has been successfully sent to MUHAMMAD SHARAF KHAQAAN of IBAN No: ****2962 on 2026-09-28 at 23:07:52. TID:725423727625 via RAAST',
    expected: { type: 'DEBIT', amount: '100', currency: 'PKR', merchant: 'MUHAMMAD SHARAF KHAQAAN', txnDate: [2026, 9, 28, 23, 7] },
  },
  {
    bank: 'Meezan',
    address: 'MEEZAN',
    body: 'PKR 4,200.00 is debited as VISA ANNUAL FEE 2025 from your A/C 28-Sep-2025 at 02:11 TID:0 UAN 021111331331',
    expected: { type: 'DEBIT', amount: '4200.00', currency: 'PKR', merchant: null, txnDate: [2025, 9, 28, 2, 11] },
    note: 'bank fee, not a merchant',
  },
  {
    bank: 'Meezan',
    address: 'MEEZAN',
    body: 'PKR 240.00 is debited as FED AMOUNT from your A/C BR LHR on 12-Mar-24 at 11:13',
    expected: { type: 'DEBIT', amount: '240.00', currency: 'PKR', merchant: null, txnDate: [2024, 3, 12, 11, 13] },
    note: 'bank charge, not a merchant',
  },
  {
    bank: 'Other (NGN)',
    address: 'ZZ-UNKNOWN',
    body: 'Transaction Receipt Transaction Details :- Date: Thu Nov 03 2022 Time: 23:30:15 Reference: S53088297 Amount: 237.32 NGN Status: SUCCESSFUL Type: Debit Narration: MTN CHARGE FOR USSD FROM JUL 1 TO JUL 31, 2022',
    expected: null,
    note: 'Nigerian naira: outside the PK/SA/AE markets, expected to be ignored',
  },
  {
    bank: 'UBL',
    address: 'UBL',
    body: 'Your UBL a/c 0002 **** 7915 has been debited with PKR 10,400 on 18-APR-23 at 17:51 through Funds Transfer to Alfalah Raast via Raast. B. info, call 111825888.',
    expected: { type: 'DEBIT', amount: '10400', currency: 'PKR', merchant: null, txnDate: [2023, 4, 18, 17, 51] },
    note: 'bank-to-bank transfer',
  },
  {
    bank: 'UBL',
    address: 'UBL',
    body: 'Your UBL a/c 0002 **** 7915 has been debited with PKR 50 on 20-APR-23 a 16:43 through Inter Bank Funds Transfer to MUHAMMAD, HABIB BANK LTD. Bal For info, call 111825888.',
    expected: { type: 'DEBIT', amount: '50', currency: 'PKR', merchant: null, txnDate: [2023, 4, 20, 16, 43] },
    note: 'person-to-person transfer',
  },
  {
    bank: 'Alfalah',
    address: 'BAFL',
    body: 'Dear customer, You have successfully deposited Rs. 26797.0 to account *7299 with fee of Rs. 203.0 17:59 PM 08/02/2025 Txn ref :. Thank you for using BAFL CDM services!',
    expected: { type: 'CREDIT', amount: '26797.0', currency: 'PKR', merchant: null, txnDate: [2025, 2, 8, 17, 59] },
  },
  {
    bank: 'HBL',
    address: 'HBL',
    body: 'Your HBL A/C 0000 ***** 12345 has been debited with PKR 208.8 on 04/11/2024 15:51:19.',
    expected: { type: 'DEBIT', amount: '208.8', currency: 'PKR', merchant: null, txnDate: [2024, 11, 4, 15, 51] },
  },
  {
    bank: 'HBL',
    address: 'HBL',
    body: 'ALI KHAN, PKR 8634.00 sent to NASIR HAYAT A/C *5214 via IBFT on 04-11-2024 04:21:56,TID 12666525615. UAN: 021111111425.',
    expected: { type: 'DEBIT', amount: '8634.00', currency: 'PKR', merchant: 'NASIR HAYAT', txnDate: [2024, 11, 4, 4, 21] },
  },
  {
    bank: 'HBL',
    address: 'HBL',
    body: 'Your HBL A/C 0000 ***** 12345 has been credited with PKR 35,000.00 on 04/12/2024 15:28:30 via Salary Credit.',
    expected: { type: 'CREDIT', amount: '35000.00', currency: 'PKR', merchant: null, txnDate: [2024, 12, 4, 15, 28] },
  },
];

const at = (t: NonNullable<Expected['txnDate']>) => new Date(t[0], t[1] - 1, t[2], t[3], t[4]).getTime();

function run(address: (s: Sample) => string) {
  const lines: string[] = [];
  const hit = { type: 0, amount: 0, currency: 0, merchant: 0, date: 0 };
  let txns = 0;
  let dates = 0;
  let rejectOk = 0;
  let rejects = 0;

  samples.forEach((s, i) => {
    const received = s.expected?.txnDate ? at(s.expected.txnDate) + 60_000 : Date.now();
    const got = parseSms({ id: String(i), address: address(s), body: s.body, date: received });
    const label = `#${i} ${s.bank}${s.note ? ` (${s.note})` : ''}`;
    if (!s.expected) {
      rejects++;
      if (got === null) rejectOk++;
      else lines.push(`${label}: should be ignored but parsed ${got.type} ${got.amount} ${got.currency}`);
      return;
    }
    txns++;
    if (!got) {
      lines.push(`${label}: MISSED`);
      return;
    }
    const e = s.expected;
    const bad: string[] = [];
    if (got.type === e.type) hit.type++; else bad.push(`type ${got.type}≠${e.type}`);
    if (got.amount === e.amount) hit.amount++; else bad.push(`amount ${got.amount}≠${e.amount}`);
    if (got.currency === e.currency) hit.currency++; else bad.push(`currency ${got.currency}≠${e.currency}`);
    if (got.merchant === e.merchant) hit.merchant++; else bad.push(`merchant ${JSON.stringify(got.merchant)}≠${JSON.stringify(e.merchant)}`);
    if (e.txnDate) {
      dates++;
      if (got.txnDate === at(e.txnDate)) hit.date++;
      else bad.push(`date ${got.txnDate ? new Date(got.txnDate).toISOString() : null}≠${new Date(at(e.txnDate)).toISOString()}`);
    }
    if (bad.length) lines.push(`${label}: ${bad.join('; ')}`);
  });

  const pct = (n: number, t: number) => `${n}/${t} (${t ? Math.round((n / t) * 100) : 0}%)`;
  return {
    failed: lines.length,
    report: [
    `type ${pct(hit.type, txns)} | amount ${pct(hit.amount, txns)} | currency ${pct(hit.currency, txns)} | merchant ${pct(hit.merchant, txns)} | date ${pct(hit.date, dates)} | ignored ${pct(rejectOk, rejects)}`,
    ...lines,
    ].join('\n'),
  };
}

describe('email-derived audit (real alert text, names replaced)', () => {
  it('parses every sample with the real sender and with an unknown sender (generic path only)', () => {
    const withBank = run((s) => s.address);
    const generic = run(() => 'ZZ-UNKNOWN');
    console.log(`EMAIL AUDIT (${samples.length} samples)\n--- real sender ---\n${withBank.report}\n--- unknown sender ---\n${generic.report}`);
    expect(withBank.failed).toBe(0);
    expect(generic.failed).toBe(0);
  });
});
