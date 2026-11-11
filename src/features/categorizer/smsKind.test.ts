import { describe, expect, it } from 'vitest';

import { smsKind } from './smsKind';

describe('smsKind', () => {
  it('spots an ATM withdrawal', () => {
    expect(smsKind('You have withdrawn Rs. 5,000 from your Digitt Plus account via ATM')).toBe('atm');
    expect(smsKind('Cash withdrawal of SAR 500 from mada card 2046')).toBe('atm');
  });

  it('spots a government fine', () => {
    expect(smsKind('SAR 300 debited for MOI traffic violation')).toBe('fine');
  });

  it('spots a bank fee', () => {
    expect(smsKind('Card transfer fee of SAR 34.50 debited from card 4821')).toBe('fee');
    expect(smsKind('Annual fee SAR 100 charged')).toBe('fee');
  });

  it('spots transfers, bills, online and POS payments', () => {
    expect(smsKind('PKR 1,300 sent via Raast to ALI')).toBe('transfer');
    expect(smsKind('SADAD bill payment SAR 120')).toBe('bill');
    expect(smsKind('Online purchase SAR 40 at noon.com')).toBe('online');
    expect(smsKind('POS purchase SAR 28 at Panda')).toBe('pos');
  });

  it('gives nothing for a message with no such wording', () => {
    expect(smsKind('PKR 810 has been debited at 8079')).toBeUndefined();
  });

  it('ranks an ATM message above the other wording it contains', () => {
    expect(smsKind('ATM cash withdrawal, bank fee SAR 5 may apply')).toBe('atm');
  });
});

describe('smsKind: money moved between own accounts, and refunds', () => {
  it('spots own-account moves and credit card payments', () => {
    expect(smsKind('SAR 1,000 transferred to your own account at STC Bank')).toBe('internal');
    expect(smsKind('Credit card payment of SAR 4,500 to card 4821')).toBe('internal');
    expect(smsKind('Payment received SAR 4,500 on your card 4821, thank you')).toBe('internal');
  });

  it('spots a refund or a reversal', () => {
    expect(smsKind('SAR 28 refunded to card 4821')).toBe('refund');
    expect(smsKind('Reversal of purchase SAR 6.08 at AIRALO')).toBe('refund');
  });
});
