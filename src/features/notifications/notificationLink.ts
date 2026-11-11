import type { Href } from 'expo-router';

import type { AppNotification } from './types';

// The budget screen's highlight for an alert about the whole budget, not one category.
export const OVERALL = 'overall';

// Where tapping a notification goes, with what to highlight there; null = it is only marked read. `at`
// makes each tap a new request, so tapping the same notification again highlights it again.
export function notificationLink(
  notification: Pick<AppNotification, 'referenceType' | 'referenceId' | 'categoryCode'> & { type?: string },
  at: number = Date.now(),
): Href | null {
  if (notification.referenceType === 'BUDGET') {
    return { pathname: '/budget', params: { highlight: notification.categoryCode ?? OVERALL, at: String(at) } };
  }
  if (notification.referenceType === 'TRANSACTION') {
    if (!notification.referenceId) return '/transactions';
    return { pathname: '/transactions', params: { highlight: notification.referenceId, at: String(at) } };
  }
  if (notification.referenceType === 'SUBSCRIPTION') return '/subscriptions';
  // An invitation, a role change or a removal: the family list shows invitations, and a family opens its page.
  if (notification.type === 'FAMILY' || notification.referenceType === 'FAMILY') {
    return notification.referenceId ? { pathname: '/family-detail', params: { id: notification.referenceId } } : '/family';
  }
  if (notification.referenceType === 'GOAL') {
    return notification.referenceId ? { pathname: '/goal', params: { id: notification.referenceId } } : '/goals';
  }
  return null;
}
