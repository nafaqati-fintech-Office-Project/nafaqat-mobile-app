import { beforeEach, describe, expect, it, vi } from 'vitest';

import { changeCategory, findUserCategory, merchantKey } from './categoryRules';
import { onTransactionsChanged } from './transactionsRepo';
import { setCurrentUserId } from '@/auth/currentUser';

const db = {
  execAsync: vi.fn(),
  runAsync: vi.fn(),
  getAllAsync: vi.fn(),
  getFirstAsync: vi.fn(),
  withTransactionAsync: vi.fn(async (work: () => Promise<void>) => work()),
};
vi.mock('expo-sqlite', () => ({ openDatabaseAsync: () => Promise.resolve(db) }));

type Row = { merchant: string | null; type: string; category: string; source: string; prediction_id?: string | null };
let row: Row | null;
let rule: { category: string } | null;

const sql = () => db.runAsync.mock.calls.map(([statement, params]) => [String(statement).replace(/\s+/g, ' '), params]);
const updates = () => sql().filter(([statement]) => String(statement).startsWith('UPDATE transactions'));

beforeEach(() => {
  vi.clearAllMocks();
  setCurrentUserId('user-1');
  row = { merchant: 'Ali  Raza', type: 'DEBIT', category: 'Uncategorized', source: 'fallback' };
  rule = null;
  db.getFirstAsync.mockImplementation(async (statement: string) => {
    if (statement.startsWith('PRAGMA')) return { user_version: 10 };
    if (statement.includes('FROM category_rules')) return rule;
    return row;
  });
  db.getAllAsync.mockResolvedValue([]);
});

describe('merchantKey', () => {
  it('ignores case and extra spaces', () => {
    expect(merchantKey('  ali   raza ')).toBe('ALI RAZA');
  });
});

describe('findUserCategory', () => {
  it('reads the signed-in user\'s rule for this merchant and direction', async () => {
    rule = { category: 'Housing' };
    expect(await findUserCategory('Ali Raza ', 'DEBIT')).toBe('Housing');
    expect(db.getFirstAsync).toHaveBeenLastCalledWith(expect.stringContaining('category_rules'), [
      'user-1',
      'ALI RAZA',
      'DEBIT',
    ]);
  });

  it('has no rules while signed out', async () => {
    setCurrentUserId(null);
    expect(await findUserCategory('Ali Raza', 'DEBIT')).toBeNull();
    expect(db.getFirstAsync).not.toHaveBeenCalledWith(expect.stringContaining('category_rules'), expect.anything());
  });

  it('never throws when the database fails', async () => {
    db.getFirstAsync.mockRejectedValue(new Error('disk'));
    expect(await findUserCategory('Ali Raza', 'DEBIT')).toBeNull();
  });
});

describe('changeCategory', () => {
  it('marks the row as picked by hand and keeps the change as unsent feedback', async () => {
    expect(await changeCategory({ id: 7, category: 'Housing', applyToMerchant: false })).toBe(1);
    expect(updates()).toEqual([[expect.stringContaining('needs_prediction = 0, retry_text = NULL'), ['Housing', 'user', 7]]]);
    const feedback = sql().find(([statement]) => String(statement).includes('INTO category_feedback'));
    expect(feedback?.[1]).toEqual(['user-1', 7, 'Ali  Raza', 'DEBIT', 'Uncategorized', 'fallback', 'Housing', expect.any(Number), null]);
    expect(sql().some(([statement]) => String(statement).includes('category_rules'))).toBe(false);
  });

  it('copies the prediction id into the feedback and clears it from the row', async () => {
    row = { merchant: 'Shell', type: 'DEBIT', category: 'Transportation', source: 'model', prediction_id: 'p-7' };
    await changeCategory({ id: 7, category: 'Fuel', applyToMerchant: false });
    expect(updates()[0][0]).toContain('prediction_id = NULL');
    const feedback = sql().find(([statement]) => String(statement).includes('INTO category_feedback'));
    expect(feedback?.[1]).toEqual(['user-1', 7, 'Shell', 'DEBIT', 'Transportation', 'model', 'Fuel', expect.any(Number), 'p-7']);
  });

  it('saves no feedback when the category did not change', async () => {
    row = { ...row!, category: 'Housing', source: 'model' };
    await changeCategory({ id: 7, category: 'Housing', applyToMerchant: false });
    expect(sql().some(([statement]) => String(statement).includes('category_feedback'))).toBe(false);
    expect(updates()).toHaveLength(1);
  });

  it('with "apply to all" saves a personal rule and updates the same name, not hand-picked rows', async () => {
    db.getAllAsync.mockResolvedValue([
      { id: 8, merchant: 'ALI RAZA' },
      { id: 9, merchant: 'ali raza ' },
      { id: 10, merchant: 'ALI HASSAN' },
    ]);
    expect(await changeCategory({ id: 7, category: 'Housing', applyToMerchant: true })).toBe(3);

    const ruleInsert = sql().find(([statement]) => String(statement).includes('INTO category_rules'));
    expect(ruleInsert?.[1]).toEqual(['user-1', 'ALI RAZA', 'DEBIT', 'Housing', expect.any(Number)]);
    const [select, params] = db.getAllAsync.mock.calls[0];
    expect(select).toMatch(/type = \? AND source <> 'user'/);
    expect(params).toEqual(['DEBIT', 7]);
    expect(updates().map(([, p]) => p)).toEqual([
      ['Housing', 'user', 7],
      ['Housing', 'rule', 8],
      ['Housing', 'rule', 9],
    ]);
  });

  it('saves no rule while signed out or for a row without a name', async () => {
    setCurrentUserId(null);
    await changeCategory({ id: 7, category: 'Housing', applyToMerchant: true });
    row = { ...row!, merchant: null };
    setCurrentUserId('user-1');
    await changeCategory({ id: 7, category: 'Fuel', applyToMerchant: true });
    expect(sql().some(([statement]) => String(statement).includes('INTO category_rules'))).toBe(false);
    expect(db.getAllAsync).not.toHaveBeenCalled();
  });

  it('does everything in one database transaction and tells open screens', async () => {
    const listener = vi.fn();
    const unsubscribe = onTransactionsChanged(listener);
    await changeCategory({ id: 7, category: 'Housing', applyToMerchant: true });
    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('does nothing for a transaction that no longer exists', async () => {
    row = null;
    expect(await changeCategory({ id: 99, category: 'Housing', applyToMerchant: true })).toBe(0);
    expect(db.runAsync).not.toHaveBeenCalled();
  });
});
