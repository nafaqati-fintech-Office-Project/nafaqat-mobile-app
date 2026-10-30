import type { Goal, GoalStatus } from './types';
import { fromMinor, toMinor } from '@/features/subscriptions/subscriptionMath';

// Worked out from the amounts the goal service sends.

export const remainingOf = (goal: Goal) =>
  fromMinor(Math.max(toMinor(goal.targetAmount, goal.currency) - toMinor(goal.savedAmount, goal.currency), 0), goal.currency);

// Whole percent, rounded down so a goal never reads 100% before it is reached; capped at 100.
export function progressOf(goal: Goal): number {
  const target = toMinor(goal.targetAmount, goal.currency);
  if (target <= 0) return 0;
  return Math.min(Math.floor((toMinor(goal.savedAmount, goal.currency) * 100) / target), 100);
}

export const isReached = (goal: Goal) =>
  toMinor(goal.savedAmount, goal.currency) >= toMinor(goal.targetAmount, goal.currency);

// Whole months from today to the target date (at least 1 while the date is ahead); null without a date
// or once it has passed.
export function monthsLeft(goal: Goal, today: Date = new Date()): number | null {
  if (!goal.targetDate) return null;
  const end = goal.targetDate;
  if (end.getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) return null;
  const months = (end.getFullYear() - today.getFullYear()) * 12 + end.getMonth() - today.getMonth();
  return Math.max(months + (end.getDate() >= today.getDate() ? 0 : -1), 1);
}

// How much to put aside each month to reach the target by its date; null when it does not apply.
export function monthlyNeeded(goal: Goal, today: Date = new Date()): string | null {
  const months = monthsLeft(goal, today);
  const remaining = toMinor(remainingOf(goal), goal.currency);
  if (months === null || remaining === 0 || goal.status !== 'ACTIVE') return null;
  return fromMinor(Math.ceil(remaining / months), goal.currency);
}

// What the service allows for each status (409 otherwise).
export const can = {
  edit: (status: GoalStatus) => status === 'ACTIVE',
  contribute: (status: GoalStatus) => status === 'ACTIVE',
  complete: (goal: Goal) => goal.status === 'ACTIVE' && isReached(goal),
  reopen: (status: GoalStatus) => status === 'COMPLETED',
  cancel: (status: GoalStatus) => status === 'ACTIVE',
  // The currency is fixed once money has been put in.
  changeCurrency: (goal: Goal) => toMinor(goal.savedAmount, goal.currency) === 0,
};

export type GoalTotals = { currency: string; saved: string; target: string; activeCount: number };

// Active goals in one currency, added up for the summary card.
export function totalsOf(goals: Goal[], currency: string): GoalTotals {
  const active = goals.filter((g) => g.status === 'ACTIVE' && g.currency === currency);
  const sum = (pick: (g: Goal) => string) => fromMinor(active.reduce((s, g) => s + toMinor(pick(g), currency), 0), currency);
  return { currency, saved: sum((g) => g.savedAmount), target: sum((g) => g.targetAmount), activeCount: active.length };
}

// The currency most active goals use, so the summary shows the bigger picture.
export function mainCurrency(goals: Goal[], fallback = 'SAR'): string {
  const counts = new Map<string, number>();
  for (const g of goals) if (g.status === 'ACTIVE') counts.set(g.currency, (counts.get(g.currency) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? goals[0]?.currency ?? fallback;
}
