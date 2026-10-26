import { CREDIT_RE, DEBIT_RE, isTransactional, WEAK_DEBIT_RE } from './filter';
import { AMOUNT_SRC, CURRENCY_SRC, GENERIC_BANK, rules } from './rules';
import type { ParsedTxn } from './types';

type SmsInput = { id: string; address: string; body: string; date: number };

const CURRENCIES: Record<string, string> = {
  rs: 'PKR',
  pkr: 'PKR',
  sar: 'SAR',
  sr: 'SAR',
  رس: 'SAR',
  ريال: 'SAR',
  aed: 'AED',
  درهم: 'AED',
};

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const CARD_RE =
  /(?:\b(?:card|a\/c|acct?|account|ending)|\*{2,}|x{2,})\D{0,12}\d*?(\d{4})(?!\d)/i;

const BALANCE_RE = new RegExp(
  `(?:\\bbal(?:ance)?|رصيد|الرصيد)\\s*(?:is|:|=|-|المتاح)?\\s*(?:(?<![A-Za-z])(?:${CURRENCY_SRC}))?\\s*(?<amount>${AMOUNT_SRC})`,
  'i',
);

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DATE_NUMERIC_RE = /(?<!\d\.|\d)(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})(?!\d|\.\d)/;
const DATE_ISO_RE = /(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/;
const DATE_NAMED_RE = /(?<!\d)(\d{1,2})[-\s]([A-Za-z]{3,9})[-\s,]*(\d{4}|\d{2})(?!\d)/;
const TIME_RE = /(?<!\d)(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]m)?/i;
const DAY_MS = 86_400_000;

function buildDate(y: number, m: number, d: number, body: string): Date | null {
  const year = y < 100 ? 2000 + y : y;
  const date = new Date(year, m - 1, d);
  if (date.getFullYear() !== year || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  const time = TIME_RE.exec(body);
  if (time) {
    let hours = Number(time[1]);
    const meridiem = time[3]?.toLowerCase();
    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
    if (hours < 24 && Number(time[2]) < 60) date.setHours(hours, Number(time[2]));
  }
  return date;
}

// Day comes before month in the supported markets (PK, SA, AE), so 05/11/2026 is 5 Nov.
function extractTxnDate(body: string, receivedAt: number): number | null {
  let date: Date | null = null;
  const named = DATE_NAMED_RE.exec(body);
  const monthIndex = named ? MONTHS.indexOf(named[2].slice(0, 3).toLowerCase()) : -1;
  if (named && monthIndex >= 0) date = buildDate(Number(named[3]), monthIndex + 1, Number(named[1]), body);
  if (!date) {
    const iso = DATE_ISO_RE.exec(body);
    if (iso) date = buildDate(Number(iso[1]), Number(iso[2]), Number(iso[3]), body);
  }
  if (!date) {
    const numeric = DATE_NUMERIC_RE.exec(body);
    if (numeric) date = buildDate(Number(numeric[3]), Number(numeric[2]), Number(numeric[1]), body);
  }
  if (!date) return null;
  const ts = date.getTime();
  // A date after the receive time (e.g. a due date) or long before it is not the transaction date.
  return ts > receivedAt + DAY_MS || ts < receivedAt - 400 * DAY_MS ? null : ts;
}

function extractBalance(body: string): string | null {
  const raw = BALANCE_RE.exec(body)?.groups?.amount;
  return raw ? normalizeAmount(raw) : null;
}

function normalizeAmount(raw: string): string | null {
  const amount = raw
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)))
    .replace(/[,٬]/g, '')
    .replace('٫', '.');
  if (!/^\d+(?:\.\d+)?$/.test(amount) || /^0+(?:\.0+)?$/.test(amount)) return null;
  return amount;
}

const normalizeCurrency = (raw: string): string | null =>
  CURRENCIES[raw.toLowerCase().replace(/[.\s]/g, '')] ?? null;

function normalizeMerchant(raw: string | undefined): string | null {
  const merchant = raw?.replace(/\s+/g, ' ').replace(/[.,;:\s]+$/, '').trim();
  // Digits-only values and ATM locations (cash withdrawals) are not merchants.
  return merchant && !/^[\d\s:./-]+$/.test(merchant) && !/^ATM\b/i.test(merchant) ? merchant : null;
}

function detectType(body: string): ParsedTxn['type'] | null {
  const debit = body.search(DEBIT_RE);
  const credit = body.search(CREDIT_RE);
  if (debit >= 0 && (credit < 0 || debit < credit)) return 'DEBIT';
  if (credit >= 0) return 'CREDIT';
  return WEAK_DEBIT_RE.test(body) ? 'DEBIT' : null;
}

function matchRules(sms: SmsInput) {
  const candidates = rules.filter((rule) => rule.senderMatch.test(sms.address));
  for (const rule of candidates) {
    for (const pattern of rule.patterns) {
      const groups = pattern.exec(sms.body)?.groups;
      if (groups?.amount && groups.currency) {
        return { bank: rule.bank === GENERIC_BANK ? sms.address : rule.bank, groups };
      }
    }
  }
  return null;
}

export function parseSms(sms: SmsInput): ParsedTxn | null {
  try {
    if (!isTransactional(sms.body)) return null;
    const matched = matchRules(sms);
    const type = detectType(sms.body);
    if (!matched || !type) return null;

    const amount = normalizeAmount(matched.groups.amount);
    const currency = normalizeCurrency(matched.groups.currency);
    if (!amount || !currency) return null;

    return {
      smsId: sms.id,
      bank: matched.bank,
      type,
      amount,
      currency,
      merchant: normalizeMerchant(matched.groups.merchant),
      cardLast4: CARD_RE.exec(sms.body)?.[1] ?? null,
      balance: extractBalance(sms.body),
      txnDate: extractTxnDate(sms.body, sms.date),
      date: sms.date,
      raw: sms.body,
    };
  } catch {
    return null;
  }
}
