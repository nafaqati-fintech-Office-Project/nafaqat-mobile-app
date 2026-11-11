import type { Goal } from './types';

// MOCK goals for auth bypass, where the goal service answers 401 (no token). Used by the assistant
// so its goal planning can be tried without an account.
export function mockGoals(today = new Date()): Goal[] {
  const inDays = (days: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
  return [
    {
      id: 'mock-goal-dubai',
      name: 'Dubai vacation',
      description: null,
      targetAmount: '6000.00',
      savedAmount: '2500.00',
      currency: 'SAR',
      targetDate: inDays(30),
      status: 'ACTIVE',
      autoSave: false,
      autoSaveKeyword: null,
      createdAt: inDays(-60),
    },
    {
      id: 'mock-goal-emergency',
      name: 'Emergency fund',
      description: null,
      targetAmount: '15000.00',
      savedAmount: '4000.00',
      currency: 'SAR',
      targetDate: null,
      status: 'ACTIVE',
      autoSave: false,
      autoSaveKeyword: null,
      createdAt: inDays(-120),
    },
  ];
}
