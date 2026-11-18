import { isTransactional } from '@/features/sms/parser/filter';

// The steps that run before a delivered message reaches the parser. They are deliberately strict about secrets.

/** The backend's test SMS (connection check) carries this marker; it never becomes a transaction. */
export const TEST_MARKER = 'NFQ-TEST';
export const hasTestMarker = (text: string): boolean => text.includes(TEST_MARKER);

const SECRET_WORDS =
  /\b(?:otp|one[- ]time|verification|passcode|cvv|pin)\b|رمز\s*(?:التحقق|سري|الدخول)|كلمة\s*(?:المرور|السر)\s*المؤقتة|رمز\s*مؤقت/i;
const CODE_NEAR_WORD = /\b(?:code|رمز)\b[^.]{0,30}?\b\d{4,8}\b|\b\d{4,8}\s+is\s+(?:your|the)\b/i;

/** A one-time password or verification code. Never stored, logged or uploaded. Mirrors the native check on purpose. */
export const isSecretCode = (text: string): boolean => SECRET_WORDS.test(text) || CODE_NEAR_WORD.test(text);

/** A real money message: an amount and a transaction word, not an advert. (Secret codes are checked separately, first.) */
export const isRelevant = (text: string): boolean => isTransactional(text.replace(/\s+/g, ' '));

// Full card numbers are shown nowhere: a run of 13 to 19 digits (spaces or dashes allowed) keeps only its last four.
const CARD_NUMBER = /\b(?:\d[ -]?){12,18}\d\b/g;
export const keepLastFourOnly = (text: string): string =>
  text.replace(CARD_NUMBER, (match) => `****${match.replace(/\D/g, '').slice(-4)}`);

/** A cheap content fingerprint for duplicate detection, so the text itself is not kept. */
export function fingerprint(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim().toLowerCase();
  let h1 = 5381;
  let h2 = 52711;
  for (let i = 0; i < normalized.length; i++) {
    const c = normalized.charCodeAt(i);
    h1 = (h1 * 33) ^ c;
    h2 = (h2 * 31 + c) | 0;
  }
  return `${(h1 >>> 0).toString(36)}${(h2 >>> 0).toString(36)}${normalized.length}`;
}
