import { fetchCurrentBudget } from './budgetApi';
import { mockBudget } from './mock';
import type { Budget } from './types';
import { AUTH_BYPASS } from '@/config/flags';

const MOCK_DELAY_MS = 400;

export async function getCurrentBudget(): Promise<Budget | null> {
  // The bypass session has no token, so the real endpoint would answer 401.
  if (AUTH_BYPASS) {
    await new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
    return mockBudget;
  }
  return fetchCurrentBudget();
}
