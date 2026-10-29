import type { BillingCycle, Subscription } from './types';
import { currencyDecimals } from '@/utils/money';

// Minor units (fils, paisa) of a decimal string, so totals never use float math.
function toMinor(amount: string, currency: string): number {
  const decimals = currencyDecimals(currency);
  const [whole, fraction = ''] = amount.trim().split('.');
  return Number(whole) * 10 ** decimals + Number(fraction.slice(0, decimals).padEnd(decimals, '0') || '0');
}

const fromMinor = (minor: number, currency: string) => (minor / 10 ** currencyDecimals(currency)).toFixed(currencyDecimals(currency));

// What a cycle's charge costs per month: weekly x 52 / 12, yearly / 12.
const PER_MONTH: Record<BillingCycle, (minor: number) => number> = {
  WEEKLY: (minor) => (minor * 52) / 12,
  MONTHLY: (minor) => minor,
  YEARLY: (minor) => minor / 12,
};

export function monthlyMinor(subscription: Subscription): number {
  return PER_MONTH[subscription.cycle](toMinor(subscription.amount, subscription.currency));
}

export type SubscriptionSummary = {
  currency: string;
  active: Subscription[];
  cancelled: Subscription[];
  unused: Subscription[];
  perMonth: string; // all active ones together, per month
  unusedPerMonth: string; // what cancelling the unused ones would save per month
  potentialYearly: string; // the same per year
  biggest: Subscription | null; // the active one that costs most per month
};

// Totals for one currency; subscriptions in other currencies are left out of the sums.
export function summarize(subscriptions: Subscription[], currency: string): SubscriptionSummary {
  const inCurrency = subscriptions.filter((s) => s.currency === currency);
  const active = inCurrency.filter((s) => s.status === 'active').sort((a, b) => a.date.getTime() - b.date.getTime());
  const cancelled = inCurrency.filter((s) => s.status === 'cancelled').sort((a, b) => b.date.getTime() - a.date.getTime());
  const unused = active.filter((s) => s.unused);
  const sum = (list: Subscription[]) => Math.round(list.reduce((total, s) => total + monthlyMinor(s), 0));
  const unusedMinor = sum(unused);
  const biggest = active.reduce<Subscription | null>(
    (top, s) => (!top || monthlyMinor(s) > monthlyMinor(top) ? s : top),
    null,
  );
  return {
    currency,
    active,
    cancelled,
    unused,
    perMonth: fromMinor(sum(active), currency),
    unusedPerMonth: fromMinor(unusedMinor, currency),
    potentialYearly: fromMinor(unusedMinor * 12, currency),
    biggest,
  };
}
