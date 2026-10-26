import { describe, expect, it } from 'vitest';

import { detectMiss } from './detectMiss';

const RECEIVED = new Date(2026, 5, 14, 12, 0).getTime();
const miss = (body: string) => detectMiss({ id: '1', address: 'BANK', body, date: RECEIVED });

describe('detectMiss', () => {
  it('flags a debit alert with no currency word', () => {
    expect(miss('Amount 1,250.00 debited from your account ending 4321 at KFC')).toBe('no_amount');
  });

  it('flags an alert that has a currency but no amount we can read', () => {
    expect(miss('Rs 1x5 settled against your A/C 1234')).toBe('parse_failed');
  });

  it('ignores messages that parse', () => {
    expect(miss('Rs 500 spent at DARAZ on card ending 4321')).toBeNull();
  });

  it('ignores OTPs, ads, failed and future-dated messages', () => {
    expect(miss('Your OTP for payment of Rs 500 on card 4321 is 482913')).toBeNull();
    expect(miss('Congratulations! Apply now for a card and get Rs 500 credited to your account')).toBeNull();
    expect(miss('Your transaction of Rs 500 on card 4321 failed')).toBeNull();
    expect(miss('Rs 300 will be debited from your account on 20/06/2026')).toBeNull();
  });

  it('ignores chat that is not from a bank or wallet', () => {
    expect(miss('I paid 500 to you yesterday, check')).toBeNull();
  });
});
