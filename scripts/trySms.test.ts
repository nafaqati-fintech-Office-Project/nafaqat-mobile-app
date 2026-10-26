import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parseSms } from '../src/features/sms/parser/parseSms';

// Helper for scripts/try-sms.ps1: parses every line of the file named in TRY_SMS_FILE.
// Line format: "SENDER|message text" (sender optional). Lines starting with # are ignored.
const file = process.env.TRY_SMS_FILE;

describe.skipIf(!file)('try SMS', () => {
  it('prints the parse result for each line', () => {
    const lines = readFileSync(file as string, 'utf8')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));

    lines.forEach((line, i) => {
      const bar = line.indexOf('|');
      const address = bar > 0 && bar < 25 ? line.slice(0, bar).trim() : 'UNKNOWN';
      const body = bar > 0 && bar < 25 ? line.slice(bar + 1).trim() : line;
      const txn = parseSms({ id: String(i + 1), address, body, date: Date.now() });
      console.log(`\n[${i + 1}] sender=${address}\n    ${body}`);
      if (!txn) {
        console.log('    => NOT a transaction (ignored)');
        return;
      }
      const when = txn.txnDate ? new Date(txn.txnDate).toLocaleString() : null;
      console.log(
        `    => ${txn.type} ${txn.amount} ${txn.currency} | merchant: ${txn.merchant ?? '-'} | ` +
          `balance: ${txn.balance ?? '-'} | date in SMS: ${when ?? '-'} | card: ${txn.cardLast4 ?? '-'} | bank: ${txn.bank}`,
      );
    });
    expect(lines.length).toBeGreaterThan(0);
  });
});
