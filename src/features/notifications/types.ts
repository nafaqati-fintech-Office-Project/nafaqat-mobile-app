// The notification service's types (NotificationType). SECURITY_ALERT and SYSTEM cannot be turned off.
export const NOTIFICATION_TYPES = [
  'BUDGET_THRESHOLD',
  'BUDGET_EXCEEDED',
  'LARGE_TRANSACTION',
  'TRANSACTION_ALERT',
  'FAMILY',
  'SUBSCRIPTION_RENEWAL',
  'GOAL_MILESTONE',
  'SECURITY_ALERT',
  'SYSTEM',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export const MANDATORY_TYPES: readonly NotificationType[] = ['SECURITY_ALERT', 'SYSTEM'];

export type Severity = 'INFO' | 'WARNING' | 'CRITICAL';

// title and message arrive already in the app's language (the client sends Accept-Language).
export type AppNotification = {
  id: string;
  type: string;
  severity: Severity;
  title: string;
  message: string;
  referenceType: string | null;
  referenceId: string | null;
  // Budget alerts for one category name it (a service code such as GROCERIES); null for the whole budget.
  categoryCode: string | null;
  read: boolean;
  createdAt: Date;
};

export type NotificationPage = { items: AppNotification[]; page: number; hasMore: boolean };

export type NotificationPreference = { type: NotificationType; enabled: boolean };
