import type { TranslationKey } from '@/i18n';

// The user sees only the final category, in their language; how it was found stays hidden.
// Keys are the category names stored on the device (the server's names plus the app's own).
const LABELS: Record<string, TranslationKey> = {
  Charity: 'category.charity',
  'Clothing & Shopping': 'category.clothingShopping',
  Education: 'category.education',
  Entertainment: 'category.entertainment',
  'Food & Beverage': 'category.foodBeverage',
  Fuel: 'category.fuel',
  Groceries: 'category.groceries',
  Health: 'category.health',
  Housing: 'category.housing',
  Investments: 'category.investments',
  'Loans/EMI': 'category.loansEmi',
  Subscriptions: 'category.subscriptions',
  Transportation: 'category.transportation',
  Travel: 'category.travel',
  Utilities: 'category.utilities',
  Income: 'category.income',
  Transfers: 'category.transfers',
  Person: 'category.person',
  Uncategorized: 'category.uncategorized',
};

export type CategoryTone = 'spending' | 'income' | 'transfer' | 'none';

// Returns null for a name the app does not know yet; the screen then shows it as stored.
export function categoryLabelKey(category: string): TranslationKey | null {
  return LABELS[category] ?? null;
}

export function categoryTone(category: string): CategoryTone {
  if (category === 'Income') return 'income';
  if (category === 'Transfers' || category === 'Person') return 'transfer';
  if (category === 'Uncategorized') return 'none';
  return 'spending';
}
