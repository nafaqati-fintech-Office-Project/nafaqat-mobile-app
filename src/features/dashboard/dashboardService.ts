import { mockDashboard } from './mock';
import type { DashboardData } from './types';
import { DASHBOARD_MOCK_FAIL } from '@/config/flags';

const MOCK_DELAY_MS = 500;

// Single place to swap for real gateway calls later.
export async function getDashboard(): Promise<DashboardData> {
  await new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
  if (DASHBOARD_MOCK_FAIL) throw new Error('Mock dashboard failure');
  return mockDashboard;
}
