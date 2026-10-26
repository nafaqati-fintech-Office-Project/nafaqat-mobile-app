import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parseSms } from '../src/features/sms/parser/parseSms';

// Evaluates the parser on a labelled CSV (columns: id, bank_or_wallet, sms_text, is_transactional,
// transaction_type, amount, currency, date, merchant_or_description, ..., template_family).
// Input: TRY_SMS_FILE. Output: <file>.eval.txt next to it.
const file = process.env.TRY_SMS_FILE;

const SENDER: Record<string, string> = {
  'Allied Bank': 'ABL',
  JazzCash: 'JazzCash',
  'Meezan Bank': 'MEEZAN',
  UBL: 'UBL',
  'Bank Alfalah': 'BAFL',
  HBL: 'HBL',
  NayaPay: 'NayaPay',
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.length > 1) rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const norm = (s: string) => s.toUpperCase().replace(/\s+/g, ' ').trim();
const pct = (n: number, t: number) => `${n}/${t} (${t ? Math.round((n / t) * 100) : 0}%)`;
const day = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

describe.skipIf(!file)('csv eval', () => {
  it('reports accuracy per template family', () => {
    const [header, ...data] = parseCsv(readFileSync(file as string, 'utf8'));
    const col = (name: string) => header.indexOf(name);
    const [cBank, cText, cType, cAmt, cCur, cDate, cMerch, cFam] = ['bank_or_wallet', 'sms_text', 'transaction_type', 'amount', 'currency', 'date', 'merchant_or_description', 'template_family'].map(col);

    type Stat = { n: number; missed: number; type: number; amount: number; currency: number; date: number; mCheck: number; mOk: number; bad: string[] };
    const fam = new Map<string, Stat>();
    const total: Stat = { n: 0, missed: 0, type: 0, amount: 0, currency: 0, date: 0, mCheck: 0, mOk: 0, bad: [] };

    for (const r of data) {
      const family = r[cFam];
      const s = fam.get(family) ?? { n: 0, missed: 0, type: 0, amount: 0, currency: 0, date: 0, mCheck: 0, mOk: 0, bad: [] };
      fam.set(family, s);
      const noon = new Date(`${r[cDate]}T12:00:00`).getTime();
      const body = r[cText];
      const got = parseSms({ id: r[0], address: SENDER[r[cBank]] ?? 'ZZ', body, date: noon + 36e5 });
      for (const t of [s, total]) t.n++;
      if (!got) { for (const t of [s, total]) t.missed++; if (s.bad.length < 3) s.bad.push(`MISSED ${r[0]}`); continue; }
      const ok = {
        type: got.type === r[cType],
        amount: Number(got.amount) === Number(r[cAmt]),
        currency: got.currency === r[cCur],
        date: got.txnDate != null && day(got.txnDate) === r[cDate],
      };
      for (const t of [s, total]) { t.type += +ok.type; t.amount += +ok.amount; t.currency += +ok.currency; t.date += +ok.date; }
      // Merchant labels in this file are partly random; only judge rows whose label appears in the text.
      const label = norm(r[cMerch]);
      if (label && norm(body).includes(label)) {
        const hit = got.merchant != null && norm(got.merchant) === label;
        for (const t of [s, total]) { t.mCheck++; t.mOk += +hit; }
        if (!hit && s.bad.length < 3) s.bad.push(`merchant ${r[0]}: got ${JSON.stringify(got.merchant)} want ${JSON.stringify(r[cMerch])}`);
      }
      if (!(ok.type && ok.amount && ok.currency) && s.bad.length < 3) s.bad.push(`fields ${r[0]}: ${JSON.stringify(ok)}`);
    }

    const line = (name: string, s: Stat) =>
      `${name.padEnd(30)} n=${String(s.n).padStart(4)} missed=${String(s.missed).padStart(3)} type ${pct(s.type, s.n)} amount ${pct(s.amount, s.n)} cur ${pct(s.currency, s.n)} date ${pct(s.date, s.n)} merchant(checkable) ${pct(s.mOk, s.mCheck)}`;
    const out = [line('ALL', total), '', ...[...fam.entries()].sort().map(([k, s]) => line(k, s)), '', ...[...fam.entries()].flatMap(([k, s]) => s.bad.map((b) => `${k}: ${b}`))].join('\n');
    writeFileSync(`${file}.eval.txt`, out);
    console.log(out);
    expect(total.n).toBeGreaterThan(0);
  });
});
