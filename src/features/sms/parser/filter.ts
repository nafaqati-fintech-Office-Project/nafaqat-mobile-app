import { AMOUNT_SRC, CURRENCY_SRC } from './rules';

export const DEBIT_RE =
  /\b(?:spent|debit(?:ed)?|purchase[sd]?|paid|withdrawn|withdrawal|sent|bill\s+payment|top-?up|outgoing|transferred\s+to|retail\s+transaction|debit\s+transaction)\b|الدفع|دفع|خصم|شراء|سحب/i;
export const CREDIT_RE = /\b(?:credited|received|deposit(?:ed)?)\b|إيداع|ايداع/i;
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

export function isTransactional(body: string): boolean {
  if (OTP_RE.test(body) || PROMO_RE.test(body) || FAILED_RE.test(body)) return false;
  if (!AMOUNT_HINT.test(body)) return false;
  return DEBIT_RE.test(body) || CREDIT_RE.test(body) || WEAK_DEBIT_RE.test(body);
}
