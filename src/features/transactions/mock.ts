import type { TransactionItem } from './transactionsApi';

// Rows shown in auth bypass, where there is no token to call the transaction service with.
// Dates are relative to now so the Today / Yesterday sections always have rows.
function at(daysAgo: number, hours: number, minutes: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export const mockTransactions: TransactionItem[] = [
  { id: '1', merchant: 'Starbucks', category: 'Food & Beverage', type: 'DEBIT', amount: '28.00', currency: 'SAR', date: at(0, 10, 24) },
  { id: '2', merchant: 'Amazon', category: 'Clothing & Shopping', type: 'DEBIT', amount: '199.00', currency: 'SAR', date: at(0, 9, 12) },
  { id: '3', merchant: 'Salary Deposit', category: 'Salary', type: 'CREDIT', amount: '7500.00', currency: 'SAR', date: at(0, 8, 0) },
  { id: '4', merchant: 'SACO', category: 'Housing', type: 'DEBIT', amount: '350.00', currency: 'SAR', date: at(1, 18, 41) },
  { id: '5', merchant: 'Spotify', category: 'Subscriptions', type: 'DEBIT', amount: '24.99', currency: 'SAR', date: at(1, 14, 20) },
  { id: '6', merchant: 'Uber', category: 'Transportation', type: 'DEBIT', amount: '45.00', currency: 'SAR', date: at(1, 11, 10) },
  { id: '7', merchant: 'Panda', category: 'Groceries', type: 'DEBIT', amount: '312.50', currency: 'SAR', date: at(3, 19, 5) },
  { id: '8', merchant: 'Aldrees', category: 'Fuel', type: 'DEBIT', amount: '90.00', currency: 'SAR', date: at(3, 7, 45) },
];
