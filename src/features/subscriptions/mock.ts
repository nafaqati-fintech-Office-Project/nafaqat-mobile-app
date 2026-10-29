import { monthlyCostOf } from './subscriptionMath';
import type { BillingCycle, Subscription } from './types';

// Shown in auth bypass, where there is no token to call the subscription service with.
// Dates are relative to today so "next" dates lie ahead and one charge is overdue.
const inDays = (days: number) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
};

type Sample = Pick<Subscription, 'id' | 'name' | 'amount' | 'status'> &
  Partial<Pick<Subscription, 'source' | 'previousAmount' | 'overdue'>> & { cycle?: BillingCycle; next: number | null; last: number };

const sample = ({ next, last, cycle = 'MONTHLY', ...rest }: Sample): Subscription => ({
  currency: 'SAR',
  cycle,
  source: 'DETECTED',
  previousAmount: null,
  overdue: false,
  ...rest,
  lastChargeDate: inDays(last),
  nextDate: next === null ? null : inDays(next),
  monthlyCost: monthlyCostOf(rest.amount, cycle, 'SAR'),
});

export const mockSubscriptions = (): Subscription[] => [
  sample({ id: 's0', name: 'Shahid VIP', amount: '29.99', status: 'DETECTED', next: 5, last: -25 }),
  sample({ id: 's1', name: 'Netflix', amount: '55.00', status: 'CONFIRMED', next: 3, last: -27 }),
  sample({ id: 's2', name: 'Spotify', amount: '24.99', previousAmount: '21.99', status: 'CONFIRMED', next: 6, last: -24 }),
  sample({ id: 's3', name: 'Microsoft 365', amount: '21.00', status: 'CONFIRMED', next: 9, last: -21 }),
  sample({ id: 's4', name: 'YouTube Premium', amount: '39.00', overdue: true, status: 'CONFIRMED', next: -4, last: -34 }),
  sample({ id: 's5', name: 'iCloud', amount: '12.99', status: 'CONFIRMED', next: 14, last: -16 }),
  sample({ id: 's6', name: 'Gym Membership', amount: '99.00', source: 'MANUAL', status: 'CONFIRMED', next: 20, last: -10 }),
  sample({ id: 's7', name: 'Anghami Plus', amount: '199.00', cycle: 'YEARLY', status: 'ENDED', next: null, last: -45 }),
];
