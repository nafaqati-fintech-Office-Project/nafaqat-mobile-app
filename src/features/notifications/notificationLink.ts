import type { Href } from 'expo-router';

import type { AppNotification } from './types';

// The budget screen's highlight for an alert about the whole budget, not one category.
export const OVERALL = 'overall';

// Where tapping a notification goes, with what to highlight there; null = it is only marked read. `at`
// makes each tap a new request, so tapping the same notification again highlights it again. The app has
// no family screen yet.
export function notificationLink(
  notification: Pick<AppNotification, 'referenceType' | 'referenceId' | 'categoryCode'>,
  at: number = Date.now(),
): Href | null {
  if (notification.referenceType === 'BUDGET') {
    return { pathname: '/budget', params: { highlight: notification.categoryCode ?? OVERALL, at: String(at) } };
  }
  if (notification.referenceType === 'TRANSACTION') {
    if (!notification.referenceId) return '/transactions';
    return { pathname: '/transactions', params: { highlight: notification.referenceId, at: String(at) } };
  }
  return null;
}
