import { describe, expect, it } from 'vitest';

import { description, externalId, serverCategory, toCreateBody, type SyncRow } from './syncMapping';

const row = (overrides: Partial<SyncRow> = {}): SyncRow => ({
  id: 1,
  smsId: '77',
  dedupeKey: '1761650000000|DEBIT|1250.00|PKR|1234',
  bank: 'HBL',
  type: 'DEBIT',
  amount: '1250.00',
  currency: 'PKR',
  merchant: 'KFC LAHORE',
  cardLast4: '1234',
  date: Date.UTC(2026, 9, 28, 12, 0),
  txnDate: null,
  category: 'Food & Beverage',
  ...overrides,
});

describe('serverCategory', () => {
  it('passes the categories the user can pick straight through', () => {
    expect(serverCategory('Loans/EMI', 'DEBIT')).toBe('Loans/EMI');
    expect(serverCategory('Salary', 'CREDIT')).toBe('Salary');
    expect(serverCategory('Other Income', 'CREDIT')).toBe('Other Income');
  });

  it('maps the app-only labels to the closest server category', () => {
    expect(serverCategory('Income', 'CREDIT')).toBe('Other Income');
    expect(serverCategory('Transfers', 'DEBIT')).toBe('Transfers');
    expect(serverCategory('Transfers', 'CREDIT')).toBe('Transfers');
    expect(serverCategory('Person', 'DEBIT')).toBe('Transfers');
    expect(serverCategory('Uncategorized', 'DEBIT')).toBe('UNCATEGORIZED');
    expect(serverCategory('Uncategorized', 'CREDIT')).toBe('UNCATEGORIZED');
    expect(serverCategory('Pets', 'DEBIT')).toBe('UNCATEGORIZED');
  });

  it('never sends a category of the wrong kind, which the server refuses', () => {
    expect(serverCategory('Salary', 'DEBIT')).toBe('UNCATEGORIZED');
    expect(serverCategory('Fuel', 'CREDIT')).toBe('UNCATEGORIZED');
    expect(serverCategory('Income', 'DEBIT')).toBe('UNCATEGORIZED');
  });
});

describe('toCreateBody', () => {
  it('builds the create request without the SMS text', () => {
    expect(toCreateBody(row())).toEqual({
      amount: 1250,
      currency: 'PKR',
      type: 'DEBIT',
      merchant: 'KFC LAHORE',
      description: 'HBL · card ****1234',
      transactionDate: '2026-10-28T12:00:00.000Z',
      externalTransactionId: 'sms:1761650000000|DEBIT|1250.00|PKR|1234',
      category: 'Food & Beverage',
      importClaim: 'sms-77-1793188800000',
    });
  });

  it('prefers the date printed in the SMS', () => {
    expect(toCreateBody(row({ txnDate: Date.UTC(2026, 9, 27) }))?.transactionDate).toBe('2026-10-27T00:00:00.000Z');
  });

  it('leaves out a missing merchant and shortens a long one', () => {
    expect(toCreateBody(row({ merchant: null }))).not.toHaveProperty('merchant');
    expect(toCreateBody(row({ merchant: '  ' }))).not.toHaveProperty('merchant');
    expect(toCreateBody(row({ merchant: 'X'.repeat(300) }))?.merchant).toHaveLength(255);
  });

  it('cannot send an unsupported currency or a bad amount', () => {
    expect(toCreateBody(row({ currency: 'USD' }))).toBeNull();
    expect(toCreateBody(row({ amount: '0' }))).toBeNull();
    expect(toCreateBody(row({ amount: 'abc' }))).toBeNull();
  });
});

describe('externalId and description', () => {
  it('stays the same for the same SMS and fits the server limits', () => {
    expect(externalId(row())).toBe(externalId(row({ id: 99, category: 'Fuel' })));
    expect(externalId(row()).length).toBeLessThanOrEqual(100);
  });

  it('describes the bank, and the card only when known', () => {
    expect(description(row({ cardLast4: null }))).toBe('HBL');
  });
});
