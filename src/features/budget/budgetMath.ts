export type BudgetTone = 'ok' | 'warning' | 'over';

// The budget service's usageStatus as a tone; unknown values read as on track.
export function toneFromStatus(status: unknown): BudgetTone {
  if (status === 'EXCEEDED') return 'over';
  if (status === 'WARNING') return 'warning';
  return 'ok';
}

// Whole percent for display, rounded down like the service (79.99 stays 79, never "80%" while on track).
export function displayPercent(percentageUsed: number): number {
  return Number.isFinite(percentageUsed) ? Math.max(0, Math.floor(percentageUsed)) : 0;
}

// Same thresholds as the budget service (UsageCalculator), for the offline mock only.
const WARNING_PERCENT = 80;
const EXCEEDED_PERCENT = 100;

export function mockUsage(spent: string, limit: string): { remaining: string; percent: number; tone: BudgetTone } {
  const max = Number(limit);
  const used = max > 0 ? (Number(spent) / max) * 100 : 0;
  const tone = used >= EXCEEDED_PERCENT ? 'over' : used >= WARNING_PERCENT ? 'warning' : 'ok';
  return { remaining: String(max - Number(spent)), percent: displayPercent(used), tone };
}
