import { CURRENCY_SRC } from '@/features/sms/parser/rules';

const MAX_LENGTH = 300;
const URL_OR_EMAIL_RE = /\b(?:https?:\/\/|www\.)\S+|\S+@\S+\.\S+/gi;
const CURRENCY_RE = new RegExp(`(?<![A-Za-z])(?:${CURRENCY_SRC})(?![A-Za-z])`, 'gi');
// Any run of digits, optionally joined by , . - / : (amounts, dates, phone numbers, IBANs, IDs).
const NUMBER_RE = /[\d٠-٩](?:[\d٠-٩,.\-/:]*[\d٠-٩])?/g;
// Letters mixed into an account-like token, e.g. PK36SCBL0000001123456702 or XXXX1234.
const ACCOUNT_TOKEN_RE = /\b(?:[A-Z]{2}\d{2}[A-Z0-9]{8,}|[Xx*]{2,}\d*)\b/g;

// Strips what the parser already extracted and anything that identifies the account or the
// person (numbers, IBANs, URLs, emails), so the server only sees the wording around a merchant.
// Names are NOT removed: the caller must not send person-to-person transfers.
export function redactForModel(body: string): string {
  return body
    .replace(URL_OR_EMAIL_RE, ' ')
    .replace(ACCOUNT_TOKEN_RE, ' ')
    .replace(CURRENCY_RE, ' ')
    .replace(NUMBER_RE, '#')
    .replace(/\s*#(?:\s*#)*\s*/g, ' # ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_LENGTH);
}
