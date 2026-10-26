import { describe, expect, it } from 'vitest';

import { parseSms } from './parseSms';

const RECEIVED = new Date(2026, 5, 14, 12, 0).getTime();
const parse = (address: string, body: string) => parseSms({ id: '1', address, body, date: RECEIVED });

describe('line-wrapped messages', () => {
  it('reads an Allied alert whose fields sit on separate lines', () => {
    const txn = parse(
      'ABL',
      `Transaction Alert

Dear ALI KHAN

A Debit transaction of PKR 90,757.00 was made in your Account No: 0000****123456 (ALI KHAN) in BLUE AREA, ISLAMABAD branch on Saturday, 14 Jun 2026 at  11:03AM.

Transaction description :              POS SANA CLOTH HOUSE
Instrument / Cheque#  :              Hide By Me`,
    );
    expect(txn).toMatchObject({ type: 'DEBIT', amount: '90757.00', merchant: 'SANA CLOTH HOUSE' });
    expect(txn?.txnDate).toBe(new Date(2026, 5, 14, 11, 3).getTime());
  });

  it('reads a NayaPay retail receipt laid out one value per line', () => {
    const txn = parse(
      'NayaPay',
      `NayaPay
Your retail transaction was successful

Sample Mart

Retail Transaction

25 Feb 2026, 05:20 AM

- Rs. 51,341
AMOUNT DETAILS
Transaction Amount

Rs. 51,341

Merchant Details

Sample Mart

Channel

VISA`,
    );
    expect(txn).toMatchObject({ type: 'DEBIT', amount: '51341', merchant: 'Sample Mart' });
  });

  it('keeps the original text in raw', () => {
    expect(parse('HBL', 'Your HBL A/C 0000 has been debited\nwith PKR 208.8 on 04/06/2026.')?.raw).toContain('\n');
  });
});
