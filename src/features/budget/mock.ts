import { mockUsage } from './budgetMath';
import type { Budget, CategoryBudget } from './types';

// The budget shown in auth bypass, where there is no token to call the budget service with.
// It is always for the current month.
const today = new Date();

const category = (name: string, spent: string, limit: string): CategoryBudget => ({
  category: name,
  spent,
  limit,
  ...mockUsage(spent, limit),
});

export const mockBudget: Budget = {
  id: 'mock',
  currency: 'SAR',
  startDate: new Date(today.getFullYear(), today.getMonth(), 1),
  endDate: new Date(today.getFullYear(), today.getMonth() + 1, 0),
  spent: '4250',
  limit: '6000',
  ...mockUsage('4250', '6000'),
  catchingUp: false,
  categories: [
    category('Food & Beverage', '935', '1200'),
    category('Clothing & Shopping', '765', '1000'),
    category('Transportation', '638', '800'),
    category('Entertainment', '298', '500'),
    category('Utilities', '340', '500'),
    category('Groceries', '1274', '1250'),
  ],
};
