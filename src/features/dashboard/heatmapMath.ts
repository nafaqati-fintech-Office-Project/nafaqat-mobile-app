import type { HeatLevel } from './types';

export const TREND_MONTHS = 6;

// Shade of one day against the month's heaviest day. Scale only: amounts are never added here.
export function heatLevel(value: number, peak: number): HeatLevel {
  if (value <= 0 || peak <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((value / peak) * 4))) as HeatLevel;
}

// Calendar layout with Monday first (as the weekly bars): empty cells before day 1, and the day count.
export function monthGrid(year: number, month: number): { offset: number; daysInMonth: number } {
  const first = new Date(Date.UTC(year, month - 1, 1));
  return {
    offset: (first.getUTCDay() + 6) % 7,
    daysInMonth: new Date(Date.UTC(year, month, 0)).getUTCDate(),
  };
}

// The `count` months ending with the given one, oldest first.
export function lastMonths(year: number, month: number, count: number = TREND_MONTHS) {
  return Array.from({ length: count }, (_, i) => {
    const index = year * 12 + (month - 1) - (count - 1 - i);
    return { year: Math.floor(index / 12), month: (index % 12) + 1 };
  });
}

// Share of income kept, rounded; null when nothing came in (no meaningful rate).
export function savingsRate(income: number, net: number): number | null {
  if (income <= 0) return null;
  return Math.round((net / income) * 100);
}
