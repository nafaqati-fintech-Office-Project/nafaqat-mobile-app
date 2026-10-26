import { parseSms } from '../parseSms';
import samplesJson from './samples.json';

export type Expected = {
  type: 'DEBIT' | 'CREDIT';
  amount: string;
  currency: string;
  // Missing = not scored (the label is not a merchant name that appears in the text).
  merchant?: string | null;
  // 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm'. Missing = not scored.
  txnDate?: string;
};

export type Sample = {
  id: string;
  source: 'email' | 'synthetic' | 'synthetic_variation' | 'real';
  split: 'dev' | 'holdout';
  bank: string;
  address: string;
  body: string;
  received: string;
  expected: Expected | null;
  family?: string;
  batch?: string;
};

export const samples = samplesJson as Sample[];

type Counter = { total: number; ok: number };
export type Field = 'type' | 'amount' | 'currency' | 'merchant' | 'date';
export const FIELDS: Field[] = ['type', 'amount', 'currency', 'merchant', 'date'];

export type Stats = {
  samples: number;
  // Transactions the parser should read, and how many it returned at all.
  txns: number;
  missed: number;
  fields: Record<Field, Counter>;
  // Messages that must be ignored, and how many were (correctly) ignored.
  negatives: Counter;
  // A transaction counted as correct only when type, amount and currency are all right.
  core: Counter;
  failures: string[];
};

const emptyStats = (): Stats => ({
  samples: 0,
  txns: 0,
  missed: 0,
  fields: { type: { total: 0, ok: 0 }, amount: { total: 0, ok: 0 }, currency: { total: 0, ok: 0 }, merchant: { total: 0, ok: 0 }, date: { total: 0, ok: 0 } },
  negatives: { total: 0, ok: 0 },
  core: { total: 0, ok: 0 },
  failures: [],
});

const toMs = (iso: string) => new Date(iso).getTime();
const sameNumber = (a: string, b: string) => Number(a) === Number(b);
const norm = (s: string | null | undefined) => (s ?? '').toUpperCase().replace(/\s+/g, ' ').trim();

function sameDate(got: number | null | undefined, expected: string): boolean {
  if (got == null) return false;
  if (!expected.includes('T')) {
    const d = new Date(got);
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return day === expected;
  }
  return got === toMs(expected);
}

export function evaluate(list: Sample[]): Stats {
  const stats = emptyStats();
  for (const s of list) {
    stats.samples++;
    const got = parseSms({ id: s.id, address: s.address, body: s.body, date: toMs(s.received) });
    const e = s.expected;
    if (!e) {
      stats.negatives.total++;
      if (got === null) stats.negatives.ok++;
      else stats.failures.push(`${s.id} [${s.bank}] should be ignored but parsed ${got.type} ${got.amount} ${got.currency}: ${oneLine(s.body)}`);
      continue;
    }
    stats.txns++;
    if (!got) {
      stats.missed++;
      stats.fields.type.total++;
      stats.fields.amount.total++;
      stats.fields.currency.total++;
      stats.core.total++;
      if (e.merchant !== undefined) stats.fields.merchant.total++;
      if (e.txnDate) stats.fields.date.total++;
      stats.failures.push(`${s.id} [${s.bank}] MISSED: ${oneLine(s.body)}`);
      continue;
    }
    const bad: string[] = [];
    const check = (field: Field, ok: boolean, detail: string) => {
      stats.fields[field].total++;
      if (ok) stats.fields[field].ok++;
      else bad.push(detail);
    };
    const typeOk = got.type === e.type;
    const amountOk = sameNumber(got.amount, e.amount);
    const currencyOk = got.currency === e.currency;
    check('type', typeOk, `type ${got.type}≠${e.type}`);
    check('amount', amountOk, `amount ${got.amount}≠${e.amount}`);
    check('currency', currencyOk, `currency ${got.currency}≠${e.currency}`);
    stats.core.total++;
    if (typeOk && amountOk && currencyOk) stats.core.ok++;
    if (e.merchant !== undefined) check('merchant', norm(got.merchant) === norm(e.merchant), `merchant ${JSON.stringify(got.merchant)}≠${JSON.stringify(e.merchant)}`);
    if (e.txnDate) check('date', sameDate(got.txnDate, e.txnDate), `date ${got.txnDate ? new Date(got.txnDate).toISOString() : null}≠${e.txnDate}`);
    if (bad.length) stats.failures.push(`${s.id} [${s.bank}] ${bad.join('; ')}: ${oneLine(s.body)}`);
  }
  return stats;
}

const oneLine = (body: string) => body.replace(/\s+/g, ' ').slice(0, 140);
const pct = (c: Counter) => (c.total ? `${c.ok}/${c.total} (${Math.round((c.ok / c.total) * 100)}%)` : 'n/a');

export function formatStats(name: string, stats: Stats): string {
  return [
    `${name}: ${stats.samples} samples (${stats.txns} transactions, ${stats.negatives.total} negatives), missed ${stats.missed}`,
    `  core (type+amount+currency) ${pct(stats.core)} | type ${pct(stats.fields.type)} | amount ${pct(stats.fields.amount)} | currency ${pct(stats.fields.currency)}`,
    `  merchant ${pct(stats.fields.merchant)} | date ${pct(stats.fields.date)} | negatives ignored ${pct(stats.negatives)}`,
  ].join('\n');
}

export function groupBy(list: Sample[], key: (s: Sample) => string): Map<string, Sample[]> {
  const groups = new Map<string, Sample[]>();
  for (const s of list) groups.set(key(s), [...(groups.get(key(s)) ?? []), s]);
  return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

export function report(list: Sample[] = samples): string {
  const parts = [formatStats('ALL', evaluate(list)), ''];
  for (const [label, key] of [
    ['By source', (s: Sample) => s.source],
    ['By split', (s: Sample) => s.split],
    ['By bank', (s: Sample) => s.bank],
  ] as const) {
    parts.push(`## ${label}`);
    for (const [name, group] of groupBy(list, key)) parts.push(formatStats(name, evaluate(group)));
    parts.push('');
  }
  parts.push('## Failures (all samples)', ...evaluate(list).failures);
  return parts.join('\n');
}
