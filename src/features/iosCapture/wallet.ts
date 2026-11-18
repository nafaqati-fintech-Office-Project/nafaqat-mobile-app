// A Wallet payment as the "Log card payment" action delivers it: three free-text values that can each be empty.

export type WalletPayment = {
  merchant: string | null;
  /** 0 when the amount was missing or zero. */
  amount: number;
  currency: string;
  cardLast4: string | null;
};

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const CURRENCY_WORDS: [RegExp, string][] = [
  [/(?:sar|\bsr\b|ر\.?\s?س|ريال)/i, 'SAR'],
  [/(?:aed|درهم)/i, 'AED'],
  [/(?:pkr|\brs\b)/i, 'PKR'],
];

export function parseWalletPayment(input: { merchant?: string; amount?: string; card?: string }): WalletPayment {
  const rawAmount = (input.amount ?? '').replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
  const number = /\d[\d,٬]*(?:[.٫]\d+)?/.exec(rawAmount)?.[0].replace(/[,٬]/g, '').replace('٫', '.');
  const amount = number ? Number.parseFloat(number) : 0;
  const currency = CURRENCY_WORDS.find(([re]) => re.test(rawAmount))?.[1] ?? 'SAR';
  const merchant = (input.merchant ?? '').replace(/\s+/g, ' ').trim();
  const digits = (input.card ?? '').replace(/\D/g, '');
  return {
    merchant: merchant || null,
    amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
    currency,
    cardLast4: digits.length >= 4 ? digits.slice(-4) : null,
  };
}

/** Empty merchant or zero amount: wait for the matching SMS instead of saving a half-empty transaction. */
export const isIncomplete = (p: WalletPayment): boolean => p.merchant === null || p.amount <= 0;

type Debit = { amount: number; currency?: string; cardLast4: string | null; at: number };

/** Same purchase? Same amount (when known), a shared card (when both known), and close in time. */
export function sameDebit(a: Debit, b: Debit, windowMs: number): boolean {
  if (Math.abs(a.at - b.at) > windowMs) return false;
  if (a.currency && b.currency && a.currency !== b.currency) return false;
  if (a.cardLast4 && b.cardLast4 && a.cardLast4 !== b.cardLast4) return false;
  if (a.amount > 0 && b.amount > 0) return Math.abs(a.amount - b.amount) < 0.005;
  // An unknown amount can only be matched through a known card.
  return a.cardLast4 !== null && a.cardLast4 === b.cardLast4;
}
