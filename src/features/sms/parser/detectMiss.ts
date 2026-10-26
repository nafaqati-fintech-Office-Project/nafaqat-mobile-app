import { CREDIT_RE, DEBIT_RE, isMoneyMovedWording, isRejectedAsNonTransaction } from './filter';
import { parseSms } from './parseSms';

type SmsInput = { id: string; address: string; body: string; date: number };

export type MissReason = 'no_amount' | 'parse_failed';

const NUMBER_RE = /\d[\d,]*(?:\.\d+)?/;
// Wording we do not parse yet but that still suggests a completed movement.
const LOOSE_VERB_RE = /\b(?:settled|posted|payments?|transaction|txn|transfer(?:red)?)\b/i;
const ACCOUNT_RE = /\b(?:a\/c|acct?|account|card|iban|wallet|bal(?:ance)?|avl)\b|حساب|بطاقة|رصيد/i;

// A message that reads like a completed money movement from a bank or wallet, yet parseSms found nothing.
// Those are the messages the app would otherwise lose without a trace; OTPs, ads and failed payments are
// deliberately not reported, because no money moved.
export function detectMiss(input: SmsInput): MissReason | null {
  const body = input.body.replace(/\s+/g, ' ').trim();
  if (isRejectedAsNonTransaction(body)) return null;
  if (parseSms(input)) return null;
  if (!NUMBER_RE.test(body) || !ACCOUNT_RE.test(body)) return null;
  if (!(DEBIT_RE.test(body) || CREDIT_RE.test(body) || isMoneyMovedWording(body) || LOOSE_VERB_RE.test(body))) return null;
  return /(?<![A-Za-z])(?:rs\.?|pkr|sar|sr|aed)\s*\d/i.test(body) ? 'parse_failed' : 'no_amount';
}
