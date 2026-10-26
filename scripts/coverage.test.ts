import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { isTransactional } from '../src/features/sms/parser/filter';
import { parseSms } from '../src/features/sms/parser/parseSms';
import { AMOUNT_SRC, CURRENCY_SRC } from '../src/features/sms/parser/rules';

// Unlabelled coverage run over a big file of real SMS (one message per line).
// Input:  TRY_SMS_FILE   Output: <file>.report.txt next to it. Prints counts and masked templates only.
const file = process.env.TRY_SMS_FILE;
const MONEY = new RegExp(`(?<![A-Za-z])(?:${CURRENCY_SRC})\\s*${AMOUNT_SRC}|${AMOUNT_SRC}\\s*(?:${CURRENCY_SRC})`, 'i');

const template = (body: string) => body.replace(/[\d٠-٩]+/g, '#').slice(0, 110);
const top = (map: Map<string, number>, n: number) =>
  [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([t, c]) => `${String(c).padStart(5)}  ${t}`);
const bump = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1);
const pct = (n: number, t: number) => `${n}/${t} (${t ? Math.round((n / t) * 100) : 0}%)`;

describe.skipIf(!file)('coverage', () => {
  it('summarises parser coverage', () => {
    // Each line is "<received ms>\t<message>" (a plain message without a tab is treated as received now).
    const rows = readFileSync(file as string, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map((l) => {
        const tab = l.indexOf('\t');
        return tab > 0 ? { at: Number(l.slice(0, tab)) || Date.now(), body: l.slice(tab + 1) } : { at: Date.now(), body: l };
      });
    const lines = rows.map((r) => r.body);
    const ignoredMoney = new Map<string, number>();
    const noMerchant = new Map<string, number>();
    const noBalance = new Map<string, number>();
    let parsed = 0, debit = 0, credit = 0, merchant = 0, balance = 0, dated = 0, withBalanceWord = 0, withDateText = 0, moneyLike = 0, filtered = 0;

    lines.forEach((body, i) => {
      const hasMoney = MONEY.test(body);
      if (hasMoney) moneyLike++;
      const txn = parseSms({ id: String(i), address: 'UNKNOWN', body, date: rows[i].at });
      if (!txn) {
        if (hasMoney) bump(ignoredMoney, template(body));
        return;
      }
      parsed++;
      if (txn.type === 'DEBIT') debit++; else credit++;
      if (txn.merchant) merchant++; else if (txn.type === 'DEBIT') bump(noMerchant, template(body));
      if (/\bbal(?:ance)?\b/i.test(body)) { withBalanceWord++; if (txn.balance) balance++; else bump(noBalance, template(body)); }
      if (/\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{1,2}[-\s][A-Za-z]{3}[-\s]\d{2,4}/.test(body)) withDateText++;
      if (txn.txnDate) dated++;
    });
    filtered = lines.filter((b) => isTransactional(b)).length;

    const debitsParsed = debit;
    const report = [
      `messages            ${lines.length}`,
      `contain an amount   ${moneyLike}`,
      `pass filter         ${filtered}`,
      `parsed              ${parsed}  (debit ${debit}, credit ${credit})`,
      `amount-bearing but ignored  ${moneyLike - parsed}`,
      `debits with merchant   ${pct(merchant - 0, debitsParsed)} (merchant counted over all parsed: ${pct(merchant, parsed)})`,
      `balance read when the word "bal" is present  ${pct(balance, withBalanceWord)}`,
      `date read when a date appears in text        ${pct(dated, withDateText)} (rough: text dates can be outside the 13-month window)`,
      '',
      '--- amount-bearing messages the parser IGNORED (masked templates) ---',
      ...top(ignoredMoney, 40),
      '',
      '--- parsed DEBITS with no merchant ---',
      ...top(noMerchant, 25),
      '',
      '--- parsed with "bal" but no balance read ---',
      ...top(noBalance, 15),
    ].join('\n');
    writeFileSync(`${file}.report.txt`, report);
    console.log(report.split('\n').slice(0, 60).join('\n'));
    expect(lines.length).toBeGreaterThan(0);
  });
});
