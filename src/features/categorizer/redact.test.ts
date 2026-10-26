import { describe, expect, it } from 'vitest';

import { redactForModel } from './redact';

describe('redactForModel', () => {
  it('removes amounts, currency, balance, card digits and dates', () => {
    const out = redactForModel(
      'Rs. 3,500.00 debited from A/C **8890 on 26-Oct-26 14:30 for POS purchase at CARREFOUR. Avl Bal Rs 20,000.00',
    );
    expect(out).not.toMatch(/\d/);
    expect(out).not.toMatch(/\bRs\b/i);
    expect(out).toContain('CARREFOUR');
  });

  it('removes phone numbers, IBANs, URLs and emails', () => {
    const out = redactForModel(
      'Paid to 03001234567 IBAN PK36SCBL0000001123456702 see https://bank.example/r/12 or help@bank.example',
    );
    expect(out).not.toMatch(/0300|PK36|https?:|@/);
  });

  it('removes Arabic-Indic digits and currency', () => {
    const out = redactForModel('شراء بمبلغ ٢٥٠٫٥٠ ر.س من نون رصيد ٣٤٠٠');
    expect(out).not.toMatch(/[٠-٩]/);
    expect(out).toContain('نون');
  });

  it('caps the length', () => {
    expect(redactForModel('word '.repeat(200)).length).toBeLessThanOrEqual(300);
  });
});
