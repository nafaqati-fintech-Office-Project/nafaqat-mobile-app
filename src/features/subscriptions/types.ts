export type BillingCycle = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

// DISMISSED ones ("not a subscription") are never listed.
export type SubscriptionStatus = 'DETECTED' | 'CONFIRMED' | 'ENDED';

// A subscription as the subscription service describes it. Money is a decimal string.
export type Subscription = {
  id: string;
  name: string;
  amount: string; // per billing cycle
  currency: string;
  cycle: BillingCycle;
  status: SubscriptionStatus;
  // Found in the user's transactions, or added by hand.
  source: 'DETECTED' | 'MANUAL';
  lastChargeDate: Date | null;
  nextDate: Date | null;
  // The price before the last change, when it changed.
  previousAmount: string | null;
  monthlyCost: string;
  // The expected charge has not shown up: maybe it was cancelled.
  overdue: boolean;
};

export type CurrencyTotal = { currency: string; monthlyTotal: string; yearlyTotal: string; activeCount: number };

export type Upcoming = { id: string; name: string; amount: string; currency: string; date: Date };

// NOT_STARTED / IN_PROGRESS: the service is still reading the user's transaction history.
export type SyncStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' | 'FAILED';

export type SubscriptionsData = {
  items: Subscription[];
  totals: CurrencyTotal[];
  upcoming: Upcoming[];
  syncStatus: SyncStatus;
};

export type NewSubscription = {
  displayName: string;
  amount: number;
  currency: string;
  cycle: BillingCycle;
  startDate: string; // yyyy-MM-dd, the first charge
};
