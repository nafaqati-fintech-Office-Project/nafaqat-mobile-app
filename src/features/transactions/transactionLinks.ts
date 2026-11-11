import { router } from 'expo-router';

import { codeForCategory } from './categoryDisplay';
import type { TransactionFilter } from './transactionsApi';

// Drill-down from a card, row or bar into the Transactions tab, filtered to what it shows. Dates are calendar days
// (yyyy-MM-dd) on the phone; the server reads them in the phone's time zone.
export type TransactionLink = {
  type?: Exclude<TransactionFilter, 'all'>;
  // One of the app's category names ('Food & Beverage'); left out when the server has no code for it.
  category?: string;
  from?: string;
  to?: string;
  q?: string;
  // A card's last 3-4 digits
  card?: string;
  // What the chip above the list says, e.g. "Groceries · November 2026".
  title: string;
};

// What the Transactions screen reads back. `drill` changes on every tap, so the same link opened twice applies again.
export type TransactionLinkParams = {
  drill?: string;
  type?: string;
  category?: string;
  from?: string;
  to?: string;
  q?: string;
  card?: string;
  title?: string;
};

const pad = (n: number) => String(n).padStart(2, '0');

export const dayKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// The first and last day of `months` months ending with year/month (month is 1-12).
export function monthsRange(year: number, month: number, months = 1): { from: string; to: string } {
  return { from: dayKey(new Date(year, month - months, 1)), to: dayKey(new Date(year, month, 0)) };
}

export function openTransactions(link: TransactionLink) {
  const category = link.category && codeForCategory(link.category) ? link.category : undefined;
  const params: TransactionLinkParams = {
    drill: String(Date.now()),
    type: link.type ?? '',
    category: category ?? '',
    from: link.from ?? '',
    to: link.to ?? '',
    q: link.q ?? '',
    card: link.card ?? '',
    title: link.title,
  };
  router.navigate({ pathname: '/transactions', params });
}

// Whether a category row can open its transactions: the server filters by its code.
export const canOpenCategory = (category: string) => codeForCategory(category) !== null;
