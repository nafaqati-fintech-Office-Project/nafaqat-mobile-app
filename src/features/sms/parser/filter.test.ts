import { describe, expect, it } from 'vitest';

import { isTransactional } from './filter';
import { parseSms } from './parseSms';

const RECEIVED = new Date(2026, 5, 14, 12, 0).getTime();

// Must never become a transaction: no money moved, or the message only carries a secret or an ad.
const REJECT = [
  'Your OTP for payment of Rs. 5,000 at DARAZ is 482913. Do not share it.',
  '482913 is your OTP to authorise purchase of PKR 1,200. Valid for 5 minutes.',
  'Use code 7731 to verify debit of Rs 900 at Foodpanda',
  'Verification code for PKR 2,500 transfer: 553821',
  'Get 20% discount! Pay Rs 500 at Khaadi and win a prize. Offer valid till Friday.',
  'Congratulations! Apply now and receive Rs 10,000 cash credited instantly to your account.',
  'Exclusive offer: spend Rs 5,000 and get Rs 500 back',
  'Your transaction of Rs 1,500 at DARAZ was declined due to insufficient balance.',
  'Payment of PKR 750 failed. Please try again.',
  'Transaction of AED 120 at CARREFOUR was rejected.',
  'Your transaction of Rs 500 failed. The debited amount will be reversed within 7 working days.',
  'Rs 300 will be debited from your account on 20/06/2026.',
  'Rs 800 to be paid at CARREFOUR. Reply YES to confirm.',
];

// Real alerts that carry a promo or security word, or mention a failed payment that was refunded.
const ACCEPT: [string, 'DEBIT' | 'CREDIT'][] = [
  ['Rs 1,200 spent at DARAZ on card ending 4321 using your discount voucher.', 'DEBIT'],
  ['Rs 900 debited from A/C 1234 at SANA CLOTH HOUSE. If this was not you, verify with the bank.', 'DEBIT'],
  ['PKR 2,000 debited from your account at KFC. Enjoy exclusive deals in the app.', 'DEBIT'],
  ['Your failed transaction of Rs 500 at DARAZ has been reversed to your account.', 'CREDIT'],
  ['AED 75 refunded to your card ending 4321 after the transaction failed.', 'CREDIT'],
  ['Rs 4,500 credited to your account from ALI KHAN. Avail our promotion on savings.', 'CREDIT'],
];

describe('isTransactional', () => {
  it.each(REJECT)('rejects: %s', (body) => {
    expect(isTransactional(body)).toBe(false);
  });

  it.each(ACCEPT)('accepts: %s', (body, type) => {
    expect(isTransactional(body)).toBe(true);
    expect(parseSms({ id: '1', address: 'BANK', body, date: RECEIVED })?.type).toBe(type);
  });
});
