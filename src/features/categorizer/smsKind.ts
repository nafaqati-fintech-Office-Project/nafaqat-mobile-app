// What kind of payment an SMS describes, read from its wording. Used for rules that need no merchant
// (ATM withdrawals, bank fees, fines) and as a hint for the model: the same name can mean another category
// for another kind of payment. Only a short label leaves the phone, never the text.
export type SmsKind = 'atm' | 'fine' | 'internal' | 'refund' | 'fee' | 'transfer' | 'bill' | 'online' | 'pos';

const ATM_RE = /\batm\b|cash\s+(?:withdrawal|withdrawn|advance)|سحب\s*نقد|صراف/i;
const FINE_RE = /traffic\s+violation|\bmoi\b|\babsher\b|مخالفة\s*مرور|مخالفات\s*مرور/i;
// Money moved between the person's own accounts, or paid to their own credit card: not spending and not income.
const INTERNAL_RE =
  /\bown\s+account\b|\bbetween\s+(?:your\s+)?(?:own\s+)?accounts\b|\bself[-\s]?transfer\b|\bcredit\s+card\s+(?:payment|bill|settlement|repayment)\b|\bcard\s+(?:payment|settlement|repayment)\s+(?:to|for|of)\b|\bpayment\s+(?:received|credited)\b[^.]{0,60}\bcard\b|\bcard[-\s]to[-\s](?:bank|account)\b|تحويل\s*بين\s*حساباتك|سداد\s*بطاقة|تسديد\s*بطاقة/i;
// Money handed back for a payment that was reversed or refunded.
const REFUND_RE = /\b(?:refund(?:ed)?|reversal|reversed|reverse\s+transaction|credited\s+back)\b|استرداد|إرجاع|عكس\s*عملية/i;
// A charge the bank itself makes. "International fee" inside a purchase message does not count: the caller
// only applies the rule when the message names no merchant.
const FEE_RE = /\b(?:bank|service|annual|sms|card|maintenance|transfer|processing|international|late|renewal)\s+(?:fees?|charges?)\b|\bfees?\s+(?:of|charged|debited)\b|رسوم/i;
const TRANSFER_RE = /\b(?:raast|ibft|iban|ips|fund\s+transfer|(?:debit|credit|bank)\s+transfer)\b|تحويل/i;
const BILL_RE = /\bbill\b|\bsadad\b|سداد|فاتورة/i;
const ONLINE_RE = /\bonline\b|e-?commerce|\becom\b|internet\s+(?:purchase|transaction)/i;
const POS_RE = /\bpos\b|point\s+of\s+sale/i;

export function smsKind(raw: string): SmsKind | undefined {
  if (ATM_RE.test(raw)) return 'atm';
  if (FINE_RE.test(raw)) return 'fine';
  if (INTERNAL_RE.test(raw)) return 'internal';
  if (REFUND_RE.test(raw)) return 'refund';
  if (FEE_RE.test(raw)) return 'fee';
  if (TRANSFER_RE.test(raw)) return 'transfer';
  if (BILL_RE.test(raw)) return 'bill';
  if (ONLINE_RE.test(raw)) return 'online';
  if (POS_RE.test(raw)) return 'pos';
  return undefined;
}
