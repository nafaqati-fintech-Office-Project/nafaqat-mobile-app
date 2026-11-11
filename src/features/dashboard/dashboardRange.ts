import type { DashboardData } from './types';
import type { Period } from '@/features/insights/insightsBuilder';

// Nothing came in or went out over the period.
export function isEmptyDashboard(data: Pick<DashboardData, 'totalSpending' | 'transactionCount' | 'cashFlow'>): boolean {
  return Number(data.totalSpending) === 0 && data.transactionCount === 0 && Number(data.cashFlow.income) === 0;
}

// When a range has nothing in it, the next wider one is tried, so a new account whose messages are from
// earlier months does not open on an empty screen. 12 months is the widest.
export const WIDER_RANGE: Partial<Record<Period, Period>> = { 1: 3, 3: 6, 6: 12 };
