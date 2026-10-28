import type { BudgetTone } from './budgetMath';

// Amounts are decimal strings, as everywhere else in the app. percent and tone come from the budget
// service (percentageUsed, usageStatus), so the screen agrees with its alerts.
export type CategoryBudget = {
  category: string;
  spent: string;
  limit: string;
  remaining: string;
  percent: number;
  tone: BudgetTone;
};

// Budgets are monthly: startDate is the first day of the month, endDate the last (both inclusive).
export type Budget = {
  id: string;
  currency: string;
  startDate: Date;
  endDate: Date;
  spent: string;
  limit: string;
  remaining: string;
  percent: number;
  tone: BudgetTone;
  // True while the service is still adding the month's earlier transactions to the totals.
  catchingUp: boolean;
  categories: CategoryBudget[];
};
