import { CREDIT_RE, DEBIT_RE, isTransactional, REVERSAL_RE, WEAK_DEBIT_RE } from './filter';
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
// The digits must follow the marker directly (optionally after "ending", "no", ":" and mask characters),
// so "card bal is 14241.55" is never read as a card. When a mask splits the number
// ("1258 ***** 69499") the part after the mask is the tail.
const CARD_RE =
  /(?:\b(?:card|a\/c|acct?|account)(?:\s+(?:no\.?|number))?(?:\s+(?:ending|ends)(?:\s+with)?)?|\bending(?:\s+with)?|\*{2,}|x{2,})\s*[:#-]?\s*(?:[*xX•●]+\s*)*(\d+)(?:\s*[*xX•●]+\s*(\d+))?(?!\d|[.,]\d)/i;

function extractCardLast4(body: string): string | null {
  const match = CARD_RE.exec(body);
  const digits = match?.[2] ?? match?.[1];
  return digits && digits.length >= 3 ? digits.slice(-4) : null;
}

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

// Day-first is the default (05/11/2026 is 5 Nov); a second number above 12 can only be a day,
// so 7/29/2020 (some UAE banks) is read as month-first.
function extractTxnDate(body: string, receivedAt: number): number | null {
  let date: Date | null = null;
  // A merchant such as "PSO SS 95 RIYASAT 1208" also looks like day-word-year, so skip words that are not months.
  for (const named of body.matchAll(new RegExp(DATE_NAMED_RE.source, 'g'))) {
    const monthIndex = MONTHS.indexOf(named[2].slice(0, 3).toLowerCase());
    if (monthIndex < 0) continue;
    date = buildDate(Number(named[3]), monthIndex + 1, Number(named[1]), body);
    break;
  }
  if (!date) {
    const iso = DATE_ISO_RE.exec(body);
    if (iso) date = buildDate(Number(iso[1]), Number(iso[2]), Number(iso[3]), body);
  }
  if (!date) {
    const numeric = DATE_NUMERIC_RE.exec(body);
    if (numeric) {
      const [first, second] = [Number(numeric[1]), Number(numeric[2])];
      const monthFirst = second > 12 && first <= 12;
      date = buildDate(Number(numeric[3]), monthFirst ? first : second, monthFirst ? second : first, body);
    }
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

// "cash withdrawn from ATM at F-7 MARKAZ": the text after "at" is the ATM location, not a shop.
const CASH_WITHDRAWAL_RE = /\bwithdraw(?:n|al)\b[^.]*\batm\b|\batm\b[^.]*\bwithdraw(?:n|al)\b/i;

function normalizeMerchant(raw: string | undefined, body: string): string | null {
  if (CASH_WITHDRAWAL_RE.test(body)) return null;
  const merchant = raw
    ?.replace(/\s+/g, ' ')
    .replace(/[.,;:\s]+$/, '')
    // Card networks append the city and country: "TEA JUNCTION in ABU DHABI", "SHOP DUBAI AE".
    .replace(/\s+in\s+[A-Z][A-Z\s]*$/, '')
    .replace(/\s+\+?\d{7,}\b/g, '')
    .replace(/\s+(?:AE|UAE|PK|SA|KSA|GB|UK|US)$/, '')
    .trim();
  // Digits-only values and ATM locations (cash withdrawals) are not merchants.
  return merchant && !/^[\d\s:./-]+$/.test(merchant) && !/^ATM\b/i.test(merchant) ? merchant : null;
}

function detectType(body: string): ParsedTxn['type'] | null {
  if (REVERSAL_RE.test(body)) return 'CREDIT';
  const debit = body.search(DEBIT_RE);
  const credit = body.search(CREDIT_RE);
  if (debit >= 0 && (credit < 0 || debit < credit)) return 'DEBIT';
  if (credit >= 0) return 'CREDIT';
  return WEAK_DEBIT_RE.test(body) ? 'DEBIT' : null;
}

// "Service Charges Rs. 0", "Fees and Government Taxes Rs. 93.86": fees often come before the real amount,
// and a zero amount is never the transaction, so neither may be picked as the amount.
const FEE_LABEL =
  '(?:service\\s+(?:fee|charges?)|fees?\\s+and\\s+(?:government\\s+)?taxes|processing\\s+fee|transaction\\s+fee|fees?|charges?|taxes?|fed|wht|gst|vat|sst)';
const FEE_RE = new RegExp(
  `\\b${FEE_LABEL}\\s*(?:\\(incl\\.?\\s*tax\\))?\\s*(?:of|:|-)?\\s*(?<![A-Za-z])(?:${CURRENCY_SRC})\\s*${AMOUNT_SRC}`,
  'gi',
);
const ZERO_AMOUNT_RE = new RegExp(`(?<![A-Za-z])(?:${CURRENCY_SRC})\\s*0+(?:\\.0+)?(?![\\d.,]*[1-9])`, 'gi');
const stripFees = (body: string) => body.replace(FEE_RE, ' ').replace(ZERO_AMOUNT_RE, ' ');

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

export function parseSms(input: SmsInput): ParsedTxn | null {
  try {
    // Alerts arrive wrapped across lines (emails, long SMS); every pattern assumes one line of text.
    const sms = { ...input, body: stripFees(input.body.replace(/\s+/g, ' ')).replace(/\s+/g, ' ').trim() };
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
      merchant: normalizeMerchant(matched.groups.merchant, sms.body),
      cardLast4: extractCardLast4(sms.body),
      balance: extractBalance(sms.body),
      txnDate: extractTxnDate(sms.body, sms.date),
      date: sms.date,
      raw: input.body,
    };
  } catch {
    return null;
  }
}
