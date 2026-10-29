import type { ParsedTxn } from '@/features/sms/parser/types';
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
  Salary: 'category.salary',
  'Other Income': 'category.otherIncome',
  Transfers: 'category.transfers',
  Person: 'category.person',
  Uncategorized: 'category.uncategorized',
};

// The services' category codes (their Category enum names) to the app's names.
const BY_CODE: Record<string, string> = {
  FOOD_AND_BEVERAGE: 'Food & Beverage',
  GROCERIES: 'Groceries',
  CLOTHING_AND_SHOPPING: 'Clothing & Shopping',
  TRANSPORTATION: 'Transportation',
  FUEL: 'Fuel',
  ENTERTAINMENT: 'Entertainment',
  SUBSCRIPTIONS: 'Subscriptions',
  HEALTH: 'Health',
  EDUCATION: 'Education',
  TRAVEL: 'Travel',
  UTILITIES: 'Utilities',
  INVESTMENTS: 'Investments',
  HOUSING: 'Housing',
  CHARITY: 'Charity',
  LOANS_EMI: 'Loans/EMI',
  SALARY: 'Salary',
  OTHER_INCOME: 'Other Income',
  UNCATEGORIZED: 'Uncategorized',
};

// Returns null for a code the app does not know yet.
export function categoryFromCode(code: unknown): string | null {
  return typeof code === 'string' ? (BY_CODE[code] ?? null) : null;
}

// The service's code for one of the app's category names; null for the app's own (Transfers, Person, Income).
export function codeForCategory(category: string): string | null {
  return Object.entries(BY_CODE).find(([, name]) => name === category)?.[0] ?? null;
}

// What the user can pick, in the transaction service's order (GET /api/transactions/categories), so a
// picked category always syncs. Income, Transfers and Person are set by the app only.
const SPENDING = [
  'Food & Beverage', 'Groceries', 'Clothing & Shopping', 'Transportation', 'Fuel', 'Entertainment', 'Subscriptions',
  'Health', 'Education', 'Travel', 'Utilities', 'Investments', 'Housing', 'Charity', 'Loans/EMI',
];
const INCOME = ['Salary', 'Other Income'];

export function pickableCategories(type: ParsedTxn['type']): string[] {
  return type === 'CREDIT' ? INCOME : SPENDING;
}

export type CategoryTone = 'spending' | 'income' | 'transfer' | 'none';

// Returns null for a name the app does not know yet; the screen then shows it as stored.
export function categoryLabelKey(category: string): TranslationKey | null {
  return LABELS[category] ?? null;
}

export function categoryTone(category: string): CategoryTone {
  if (category === 'Income' || INCOME.includes(category)) return 'income';
  if (category === 'Transfers' || category === 'Person') return 'transfer';
  if (category === 'Uncategorized') return 'none';
  return 'spending';
}
