export type BillingCycle = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

// The tile colour for a subscription's first letter (no brand logos in the app).
export type SubscriptionTone = 'red' | 'green' | 'blue' | 'violet' | 'orange';

export type Subscription = {
  id: string;
  name: string;
  // One of the app's category names (see categoryDisplay).
  category: string;
  amount: string; // per billing cycle, decimal string
  currency: string;
  cycle: BillingCycle;
  status: 'active' | 'cancelled';
  // Active: the next charge. Cancelled: when it ended.
  date: Date;
  // No use seen for a while: a candidate for cancelling.
  unused: boolean;
  tone: SubscriptionTone;
};
