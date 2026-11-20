import { AMOUNT_SRC, CURRENCY_SRC } from './rules';

export const DEBIT_RE =
  /\b(?:spent|debit(?:ed)?|purchase[sd]?|paid|withdrawn|withdrawal|sent|bill\s+payment|top-?up|outgoing|transferred\s+to|retail\s+transaction|debit\s+transaction|credit\s+card\s+payment|bank\s+transfer|moi\s+payments?|trxn?|charged|deducted|(?<!credit\s+)(?:transaction|txn)\s+of\s+.{0,40}?\s+(?:was\s+)?made|used\s+(?:for|at))\b|الدفع|دفع|خصم|شراء|سحب/i;
export const CREDIT_RE = /\b(?:credited|received|incoming|credit\s+transfer|deposit(?:ed)?)\b|إيداع|ايداع/i;
// A reversed or refunded purchase puts the money back, whatever else the message says.
export const REVERSAL_RE = /\b(?:reversed|reversal|reverse\s+transaction|refund(?:ed)?)\b/i;
export const WEAK_DEBIT_RE = /\b(?:pos|atm)\b/i;

const AMOUNT_HINT = new RegExp(
  `(?<![A-Za-z])(?:${CURRENCY_SRC})\\s*${AMOUNT_SRC}|${AMOUNT_SRC}\\s*(?:${CURRENCY_SRC})`,
  'i',
);
const OTP_RE =
  /\b(?:otp|one[- ]time|verification|verify|cvv|passcode)\b|رمز\s*(?:التحقق|سري|الدخول)|كلمة\s*(?:المرور|السر)\s*المؤقتة/i;
const PROMO_RE =
  /\b(?:offer|discount|promo(?:tion)?|congratulations|apply now|exclusive)\b|عرض|اربح|خصم\s*\d+\s*%/i;

const FAILED_RE = /\b(?:declined|failed|unsuccessful|rejected|insufficient)\b/i;

// A code next to "otp"/"pin"/"code" means the message exists to deliver a secret, whatever amount it mentions.
const OTP_CODE_RE =
  /\b(?:otp|code|pin|passcode)\b[^.]{0,30}?\b\d{4,8}\b|\b\d{4,8}\s+is\s+(?:your|the)\b[^.]{0,20}\b(?:otp|code|pin)\b/i;
// Money has already moved: "debited", "has been paid". Future or conditional forms ("will be debited") do not count.
const COMPLETED_RE =
  /(?<!\b(?:will|to|shall|would|may|can)\s+be\s+)\b(?:debited|credited|spent|received|withdrawn|deposited|reversed|refunded)\b|\b(?:has|have|had|was|were|been|successfully)\s+(?:been\s+)?(?:paid|sent|transferred)\b/i;
const MARKER_RE = /\b(?:a\/c|acct?|account|card|iban|wallet|bal(?:ance)?|avl|available)\b|\b(?:at|to|from)\s+\S/i;
const PERSONAL_RE = /\b(?:i|we)\s+(?:have\s+)?(?:sent|paid|transferred|received)\b/i;
const ACCOUNT_MARKER_RE = /\b(?:a\/c|acct?|account|card|iban|wallet|bal(?:ance)?)\b/i;
const FUTURE_RE =/\b(?:will|to|shall|would|may)\s+be\s+(?:debited|credited|paid|sent|charged|deducted|transferred)\b/i;
// Call-to-action wording is an advert even when it quotes an amount; plain "discount"/"exclusive" is not.
const PROMO_AD_RE = /\b(?:apply\s+now|congratulations|offer\s+valid|you\s+(?:have\s+)?won)\b/i;
// A failed payment whose money came back is still worth recording; "will be reversed" is not.
const MONEY_RETURNED_RE = /(?<!\b(?:will|to|shall|would|may|can)\s+be\s+)\b(?:reversed|refunded)\b|\bcredited\s+back\b/i;

export const isMoneyMovedWording = (body: string): boolean => COMPLETED_RE.test(body) || REVERSAL_RE.test(body);

// True when the wording says no money moved (secret code, advert, future charge, failed payment).
export function isRejectedAsNonTransaction(body: string): boolean {
  if (OTP_CODE_RE.test(body) || PROMO_AD_RE.test(body)) return true;
  // A person telling you what they did ("I sent you Rs 500"), not a bank or wallet alert.
  if (PERSONAL_RE.test(body) && !ACCOUNT_MARKER_RE.test(body)) return true;
  // "will be debited" announces a future charge; nothing has happened yet.
  if (FUTURE_RE.test(body) && !COMPLETED_RE.test(body)) return true;
  // A failure means no money moved, unless the message says it was handed back.
  if (FAILED_RE.test(body)) return !MONEY_RETURNED_RE.test(body);
  // A completed money movement with an account/merchant marker outranks stray promo or "verify" words
  // ("... using your discount voucher", "if this wasn't you, verify with the bank").
  if (COMPLETED_RE.test(body) && MARKER_RE.test(body)) return false;
  return OTP_RE.test(body) || PROMO_RE.test(body);
}

export function isTransactional(body: string): boolean {
  if (!AMOUNT_HINT.test(body)) return false;
  if (!(DEBIT_RE.test(body) || CREDIT_RE.test(body) || REVERSAL_RE.test(body) || WEAK_DEBIT_RE.test(body))) return false;
  return !isRejectedAsNonTransaction(body);
}
