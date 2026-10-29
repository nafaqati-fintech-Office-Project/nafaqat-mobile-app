import type { BillingCycle, Subscription, SubscriptionsData } from './types';
import { currencyDecimals } from '@/utils/money';

// Minor units (fils, paisa) of a decimal string, so sums never use float math.
export function toMinor(amount: string, currency: string): number {
  const decimals = currencyDecimals(currency);
  const [whole, fraction = ''] = amount.trim().replace('-', '').split('.');
  const minor = Number(whole) * 10 ** decimals + Number(fraction.slice(0, decimals).padEnd(decimals, '0') || '0');
  return amount.trim().startsWith('-') ? -minor : minor;
}

export function fromMinor(minor: number, currency: string): string {
  const decimals = currencyDecimals(currency);
  const digits = String(Math.abs(Math.round(minor))).padStart(decimals + 1, '0');
  return `${minor < 0 ? '-' : ''}${digits.slice(0, -decimals)}.${digits.slice(-decimals)}`;
}

// Per-month cost of one charge, as the service computes monthlyCost (used for the offline sample).
const PER_MONTH: Record<BillingCycle, number> = { WEEKLY: 52 / 12, MONTHLY: 1, QUARTERLY: 1 / 3, YEARLY: 1 / 12 };
export const monthlyCostOf = (amount: string, cycle: BillingCycle, currency: string) =>
  fromMinor(toMinor(amount, currency) * PER_MONTH[cycle], currency);

export const priceWentUp = (s: Subscription) =>
  s.previousAmount !== null && toMinor(s.previousAmount, s.currency) < toMinor(s.amount, s.currency);

export const needsAttention = (s: Subscription) => s.overdue || priceWentUp(s);

export type SubscriptionView = {
  currency: string;
  review: Subscription[]; // DETECTED: waiting for the user to confirm
  active: Subscription[]; // CONFIRMED in the currency, next charge first
  ended: Subscription[]; // ENDED in the currency, most recent first
  attention: Subscription[]; // active ones overdue or with a higher price
  perMonth: string;
  dueSoon: { total: string; count: number }; // the service's next 30 days
  biggest: Subscription | null; // highest monthly cost among the active ones
};

const time = (date: Date | null) => date?.getTime() ?? Number.MAX_SAFE_INTEGER;

// The user's currency when it has subscriptions; otherwise the one with the highest monthly total.
export function pickCurrency(data: SubscriptionsData, preferred: string | null): string {
  const has = (currency: string) => data.items.some((s) => s.currency === currency);
  if (preferred && has(preferred)) return preferred;
  const top = [...data.totals].sort((a, b) => toMinor(b.monthlyTotal, b.currency) - toMinor(a.monthlyTotal, a.currency))[0];
  return top?.currency ?? data.items[0]?.currency ?? preferred ?? 'SAR';
}

// What the screen shows, for one currency (detected ones are listed whatever their currency).
export function viewOf(data: SubscriptionsData, preferred: string | null): SubscriptionView {
  const currency = pickCurrency(data, preferred);
  const mine = data.items.filter((s) => s.currency === currency);
  const active = mine.filter((s) => s.status === 'CONFIRMED').sort((a, b) => time(a.nextDate) - time(b.nextDate));
  const ended = mine
    .filter((s) => s.status === 'ENDED')
    .sort((a, b) => time(b.lastChargeDate) - time(a.lastChargeDate));
  const total = data.totals.find((t) => t.currency === currency);
  const perMonth =
    total?.monthlyTotal ?? fromMinor(active.reduce((sum, s) => sum + toMinor(s.monthlyCost, currency), 0), currency);
  const due = data.upcoming.filter((u) => u.currency === currency);
  return {
    currency,
    review: data.items.filter((s) => s.status === 'DETECTED'),
    active,
    ended,
    attention: active.filter(needsAttention),
    perMonth,
    dueSoon: { total: fromMinor(due.reduce((sum, u) => sum + toMinor(u.amount, currency), 0), currency), count: due.length },
    biggest: active.reduce<Subscription | null>(
      (top, s) => (!top || toMinor(s.monthlyCost, currency) > toMinor(top.monthlyCost, currency) ? s : top),
      null,
    ),
  };
}
