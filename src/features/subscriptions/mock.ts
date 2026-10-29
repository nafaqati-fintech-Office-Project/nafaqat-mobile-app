import type { Subscription } from './types';

// Sample subscriptions for the screen until it is connected to the subscription service (#26).
// Dates are relative to today so the "Next" dates always lie ahead.
const inDays = (days: number) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
};

const base = { currency: 'SAR', cycle: 'MONTHLY' as const, status: 'active' as const, unused: false };

export const mockSubscriptions: Subscription[] = [
  { ...base, id: 's1', name: 'Netflix', category: 'Entertainment', amount: '55.00', date: inDays(3), tone: 'red' },
  { ...base, id: 's2', name: 'Spotify', category: 'Subscriptions', amount: '24.99', date: inDays(6), tone: 'green' },
  { ...base, id: 's3', name: 'Microsoft 365', category: 'Subscriptions', amount: '21.00', date: inDays(9), tone: 'blue' },
  {
    ...base,
    id: 's4',
    name: 'YouTube Premium',
    category: 'Entertainment',
    amount: '39.00',
    date: inDays(11),
    unused: true,
    tone: 'red',
  },
  { ...base, id: 's5', name: 'iCloud', category: 'Subscriptions', amount: '12.99', date: inDays(14), tone: 'blue' },
  {
    ...base,
    id: 's6',
    name: 'Gym Membership',
    category: 'Health',
    amount: '99.00',
    date: inDays(20),
    unused: true,
    tone: 'violet',
  },
  {
    ...base,
    id: 's7',
    name: 'Shahid VIP',
    category: 'Entertainment',
    amount: '29.99',
    status: 'cancelled',
    date: inDays(-18),
    tone: 'orange',
  },
  {
    ...base,
    id: 's8',
    name: 'Anghami Plus',
    category: 'Subscriptions',
    amount: '199.00',
    cycle: 'YEARLY',
    status: 'cancelled',
    date: inDays(-45),
    tone: 'violet',
  },
];
