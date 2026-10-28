import { describe, expect, it } from 'vitest';

import { categoryLabelKey, categoryTone } from './categoryDisplay';
import lookup from '@/features/categorizer/merchantLookup.json';
import { ar } from '@/i18n/ar';
import { en } from '@/i18n/en';

// The model server's SUPPORTED_CATEGORIES, plus the names the app itself stores.
const SERVER = [
  'Charity', 'Clothing & Shopping', 'Education', 'Entertainment', 'Food & Beverage', 'Fuel', 'Groceries',
  'Health', 'Housing', 'Investments', 'Loans/EMI', 'Subscriptions', 'Transportation', 'Travel', 'Utilities',
];
const APP = ['Income', 'Transfers', 'Person', 'Uncategorized'];

describe('categoryLabelKey', () => {
  it('has an English and an Arabic name for every category the app can store', () => {
    const all = new Set([...SERVER, ...APP, ...lookup.map((entry) => entry.category)]);
    for (const category of all) {
      const key = categoryLabelKey(category);
      expect(key, category).not.toBeNull();
      expect(en[key!]).toBeTruthy();
      expect(ar[key!]).toBeTruthy();
    }
  });

  it('returns null for a name it does not know, so the screen shows it as stored', () => {
    expect(categoryLabelKey('Pets')).toBeNull();
  });
});

describe('categoryTone', () => {
  it('colours income, transfers and uncategorized apart from spending', () => {
    expect(categoryTone('Income')).toBe('income');
    expect(categoryTone('Transfers')).toBe('transfer');
    expect(categoryTone('Person')).toBe('transfer');
    expect(categoryTone('Uncategorized')).toBe('none');
    expect(categoryTone('Fuel')).toBe('spending');
    expect(categoryTone('Pets')).toBe('spending');
  });
});
