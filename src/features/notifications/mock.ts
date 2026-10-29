import { NOTIFICATION_TYPES, type AppNotification, type NotificationPreference } from './types';

// Shown in auth bypass, where there is no token to call the notification service with. Changes (read,
// delete, switches) are kept in memory until the app restarts.
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);

export const mockNotifications: AppNotification[] = [
  {
    id: 'n1',
    type: 'BUDGET_THRESHOLD',
    severity: 'WARNING',
    title: 'Groceries budget at 80%',
    message: 'You have spent SAR 800 of your SAR 1,000 Groceries budget this month.',
    referenceType: 'BUDGET',
    referenceId: 'b1',
    categoryCode: 'GROCERIES',
    read: false,
    createdAt: minutesAgo(25),
  },
  {
    id: 'n2',
    type: 'LARGE_TRANSACTION',
    severity: 'INFO',
    title: 'Large payment',
    message: 'SAR 350 was paid to SACO.',
    referenceType: 'TRANSACTION',
    // The SACO row in the sample transactions.
    referenceId: '4',
    categoryCode: null,
    read: false,
    createdAt: minutesAgo(60 * 20),
  },
  {
    id: 'n3',
    type: 'BUDGET_EXCEEDED',
    severity: 'CRITICAL',
    title: 'Food & Beverage budget exceeded',
    message: 'You are SAR 120 over your Food & Beverage budget for this month.',
    referenceType: 'BUDGET',
    referenceId: 'b1',
    categoryCode: 'FOOD_AND_BEVERAGE',
    read: true,
    createdAt: minutesAgo(60 * 50),
  },
];

export const mockPreferences: NotificationPreference[] = NOTIFICATION_TYPES.map((type) => ({ type, enabled: true }));
