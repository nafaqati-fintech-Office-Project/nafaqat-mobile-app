import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parseSms } from '../src/features/sms/parser/parseSms';

// Runs the parser over a bank statement transcribed as "date|time|type|description|signed amount|balance"
// lines (TRY_SMS_FILE). A statement row is not an SMS, but it is real alert-like text with ground truth:
// the sign gives the type and the balance column checks balance extraction. Keep the input file out of the repo.
const file = process.env.TRY_SMS_FILE;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

describe.skipIf(!file)('statement rows', () => {
  it('parses each row', () => {
    const rows = readFileSync(file as string, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => l.split('|'));
    const lines: string[] = [];
    const hit = { type: 0, amount: 0, balance: 0, date: 0 };
    let missed = 0;
    rows.forEach(([date, time, kind, desc, signed, balance], i) => {
      const at = new Date(`${date}T${time}:00`);
      const amount = Math.abs(Number(signed));
      const sign = Number(signed) < 0 ? '-' : '+';
      const body = `${kind} ${desc} ${at.getDate()} ${MONTHS[at.getMonth()]} ${at.getFullYear()} ${time} ${sign}Rs. ${amount.toLocaleString('en-US')} Balance Rs. ${Number(balance).toLocaleString('en-US')}`;
      const got = parseSms({ id: String(i), address: 'NayaPay', body, date: at.getTime() + 60_000 });
      if (!got) {
        missed++;
        lines.push(`#${i + 1} MISSED: ${body.slice(0, 110)}`);
        return;
      }
      const bad: string[] = [];
      const wantType = Number(signed) < 0 ? 'DEBIT' : 'CREDIT';
      if (got.type === wantType) hit.type++; else bad.push(`type ${got.type}≠${wantType}`);
      if (Number(got.amount) === amount) hit.amount++; else bad.push(`amount ${got.amount}≠${amount}`);
      if (Number(got.balance) === Number(balance)) hit.balance++; else bad.push(`balance ${got.balance}≠${balance}`);
      if (got.txnDate === at.getTime()) hit.date++; else bad.push(`date ${got.txnDate ? new Date(got.txnDate).toISOString() : null}`);
      lines.push(`#${i + 1} ${bad.length ? 'BAD ' + bad.join('; ') + ' | ' : 'ok  '}merchant=${JSON.stringify(got.merchant)} card=${got.cardLast4}`);
    });
    console.log([`rows ${rows.length}, missed ${missed}`, JSON.stringify(hit), ...lines].join('\n'));
    expect(rows.length).toBeGreaterThan(0);
  });
});
