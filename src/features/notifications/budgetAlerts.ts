import { OVERALL } from './notificationLink';
import type { AppNotification } from './types';
import type { Budget } from '@/features/budget/types';
import { categoryFromCode } from '@/features/transactions/categoryDisplay';
import { currencyDecimals } from '@/utils/money';

// Same thresholds as the budget service: 80% is a warning, 100% is exceeded.
export const WARNING_PERCENT = 80;
export const EXCEEDED_PERCENT = 100;

export type AlertLevel = 'warning' | 'exceeded';

// The highest level already shown on the phone, per budget and scope (the whole budget or one category).
// Levels only go up, so a limit is announced once at 80% and once at 100%.
export type AnnouncedLevels = Record<string, AlertLevel>;

const RANK: Record<AlertLevel, number> = { warning: 1, exceeded: 2 };
const higher = (level: AlertLevel, than: AlertLevel | undefined) => !than || RANK[level] > RANK[than];

export const levelOf = (percent: number): AlertLevel | null =>
  percent >= EXCEEDED_PERCENT ? 'exceeded' : percent >= WARNING_PERCENT ? 'warning' : null;

export const levelKey = (budgetId: string, scope: string) => `${budgetId}:${scope}`;

// Alerts the server creates that are worth a phone banner.
export const BANNER_TYPES = ['BUDGET_THRESHOLD', 'BUDGET_EXCEEDED', 'LARGE_TRANSACTION'] as const;
const BUDGET_TYPES = ['BUDGET_THRESHOLD', 'BUDGET_EXCEEDED'];

export const isBudgetAlert = (n: Pick<AppNotification, 'type'>) => BUDGET_TYPES.includes(n.type);

function serverLevel(n: AppNotification): AlertLevel | null {
  if (n.type === 'BUDGET_EXCEEDED') return 'exceeded';
  if (n.type === 'BUDGET_THRESHOLD') return 'warning';
  return null;
}

const serverScope = (n: AppNotification) => (n.categoryCode ? (categoryFromCode(n.categoryCode) ?? n.categoryCode) : OVERALL);

export type ServerPlan = {
  show: AppNotification[]; // to show as a phone banner now
  ids: string[]; // every alert to remember as announced (shown or not)
  levels: AnnouncedLevels; // the levels after these alerts
};

// Which of the server's newest notifications get a banner. `knownIds` is null on the very first run:
// what is already there is remembered without a banner, so installing never floods the phone.
export function planServerAlerts(
  items: AppNotification[],
  knownIds: ReadonlySet<string> | null,
  announced: AnnouncedLevels,
): ServerPlan {
  const levels = { ...announced };
  const show: AppNotification[] = [];
  const ids: string[] = [];
  const candidates = items.filter((n) => !n.read && (BANNER_TYPES as readonly string[]).includes(n.type));

  // Oldest first, so a 100% alert after an 80% one for the same limit wins.
  for (const n of [...candidates].reverse()) {
    if (knownIds?.has(n.id)) continue;
    ids.push(n.id);
    const level = serverLevel(n);
    if (!level || !n.referenceId) {
      if (knownIds) show.push(n);
      continue;
    }
    const key = levelKey(n.referenceId, serverScope(n));
    const fresh = higher(level, levels[key]);
    levels[key] = fresh ? level : levels[key];
    if (knownIds && fresh) show.push(n);
  }
  return { show, ids, levels };
}

export type LocalAlert = {
  key: string;
  scope: string; // the app's category name, or OVERALL
  level: AlertLevel;
  percent: number;
  spent: string;
  limit: string;
  currency: string;
  categoryCode: string | null;
  budgetId: string;
};

export type LocalSpending = { total: number; byCategory: ReadonlyMap<string, number> };

const amount = (value: number, currency: string) => value.toFixed(currencyDecimals(currency));

// Compares this month's spending with the budget's limits. The larger of the server's figure and the
// phone's own transactions counts: the server may be behind, and the phone may not see other devices.
// Numbers here are for thresholds and display only.
export function planLocalAlerts(
  budget: Budget,
  local: LocalSpending,
  announced: AnnouncedLevels,
  codeFor: (category: string) => string | null,
): { alerts: LocalAlert[]; levels: AnnouncedLevels } {
  const levels = { ...announced };
  const alerts: LocalAlert[] = [];
  const check = (scope: string, serverSpent: string, limit: string, localSpent: number) => {
    const max = Number(limit);
    if (!(max > 0)) return;
    const spent = Math.max(Number(serverSpent) || 0, localSpent);
    const percent = Math.floor((spent / max) * 100);
    const level = levelOf(percent);
    const key = levelKey(budget.id, scope);
    if (!level || !higher(level, levels[key])) return;
    levels[key] = level;
    alerts.push({
      key,
      scope,
      level,
      percent,
      spent: amount(spent, budget.currency),
      limit: amount(max, budget.currency),
      currency: budget.currency,
      categoryCode: scope === OVERALL ? null : codeFor(scope),
      budgetId: budget.id,
    });
  };

  check(OVERALL, budget.spent, budget.limit, local.total);
  for (const c of budget.categories) check(c.category, c.spent, c.limit, local.byCategory.get(c.category) ?? 0);
  return { alerts, levels };
}

const SEVERITY: Record<string, number> = { CRITICAL: 2, WARNING: 1, INFO: 0 };

// The unread budget alert the dashboard strip shows: exceeded before warning, then newest.
export function topBudgetAlert(items: AppNotification[]): AppNotification | null {
  const unread = items.filter((n) => !n.read && isBudgetAlert(n));
  unread.sort(
    (a, b) =>
      (serverLevel(b) === 'exceeded' ? 1 : 0) - (serverLevel(a) === 'exceeded' ? 1 : 0) ||
      (SEVERITY[b.severity] ?? 0) - (SEVERITY[a.severity] ?? 0) ||
      b.createdAt.getTime() - a.createdAt.getTime(),
  );
  return unread[0] ?? null;
}
