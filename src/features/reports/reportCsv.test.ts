import { describe, expect, it } from 'vitest';

import { buildReportCsv, csvCell, reportCsvFileName } from './reportCsv';
import { mockReport } from './mock';

describe('csvCell', () => {
  it('quotes a cell with a comma, a quote or a line break', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('two\nlines')).toBe('"two\nlines"');
  });

  it('stops a merchant name from running as an Excel formula', () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe('"\'=HYPERLINK(""http://x"")"');
    expect(csvCell('+123')).toBe("'+123");
    expect(csvCell('Panda')).toBe('Panda');
  });
});

describe('buildReportCsv', () => {
  it('has a header and one line per spending row, with the byte order mark Excel needs', () => {
    const report = {
      ...mockReport({ year: 2026, month: 10 }),
      rows: [{ date: '2026-10-03T09:15:00.000Z', merchant: 'Panda, Riyadh', description: 'SNB · card ****4821', category: 'Groceries', amount: '28.50' }],
    };
    const csv = buildReportCsv(report);
    const lines = csv.split('\r\n');
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(lines[0].slice(1)).toBe('Date,Merchant,Description,Category,Amount,Currency');
    expect(lines[1]).toBe('2026-10-03 09:15,"Panda, Riyadh",SNB · card ****4821,Groceries,28.50,SAR');
  });

  it('names the file after the month', () => {
    expect(reportCsvFileName({ period: { year: 2026, month: 3 } })).toBe('Nafaqati-Report-2026-03.csv');
  });
});
