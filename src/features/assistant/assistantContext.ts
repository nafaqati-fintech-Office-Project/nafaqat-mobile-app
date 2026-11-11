import type { AssistantData } from './types';
import { AUTH_BYPASS } from '@/config/flags';
import { getCurrentBudget } from '@/features/budget/budgetService';
import { listGoals } from '@/features/goals/goalsApi';
import { mockGoals } from '@/features/goals/mock';
import { currentPeriod, getReport, type Period } from '@/features/reports/reportsService';
import type { Report } from '@/features/reports/types';
import { getSubscriptions } from '@/features/subscriptions/subscriptionsService';

// This month and the two before it: enough for comparisons, patterns and a usual monthly surplus.
const MONTHS = 3;

const back = ({ year, month }: Period, steps: number): Period => {
  const index = year * 12 + (month - 1) - steps;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
};

// Loads what the assistant answers from. Only this month's report is required; anything else that
// fails is left out, and the answers say what they could not see.
export async function loadAssistantData(firstName: string | null): Promise<AssistantData> {
  const start = await currentPeriod();
  const periods = Array.from({ length: MONTHS }, (_, i) => back(start, i));
  const [reports, budget, goals, subscriptions] = await Promise.all([
    Promise.all(periods.map((p, i) => (i === 0 ? getReport(p) : getReport(p).catch(() => null)))),
    getCurrentBudget().catch(() => null),
    AUTH_BYPASS ? Promise.resolve(mockGoals()) : listGoals().catch(() => []),
    getSubscriptions().catch(() => null),
  ]);
  const months = reports.filter((r): r is Report => r !== null);
  return {
    firstName,
    currency: months[0]?.currency ?? 'SAR',
    today: new Date(),
    months,
    budget,
    goals: goals.filter((g) => g.status === 'ACTIVE'),
    subscriptions: (subscriptions?.items ?? []).filter((s) => s.status === 'CONFIRMED'),
  };
}
