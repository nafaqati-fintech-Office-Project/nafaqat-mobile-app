import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { report } from '../src/features/sms/parser/dataset/evaluate';

// Run with REPORT=1 to write src/features/sms/parser/dataset/REPORT.txt (the file kept next to the dataset).
describe.skipIf(!process.env.REPORT)('accuracy report', () => {
  it('writes the report', () => {
    const text = report();
    writeFileSync('src/features/sms/parser/dataset/REPORT.txt', text);
    console.log(text);
    expect(text.length).toBeGreaterThan(0);
  });
});
