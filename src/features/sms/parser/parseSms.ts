import { CREDIT_RE, DEBIT_RE, isTransactional, WEAK_DEBIT_RE } from './filter';
import { GENERIC_BANK, rules } from './rules';
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
  return merchant ? merchant : null;
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
      date: sms.date,
      raw: sms.body,
    };
  } catch {
    return null;
  }
}
