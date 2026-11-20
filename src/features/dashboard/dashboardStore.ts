import { getDashboard } from './dashboardService';
import type { DashboardData } from './types';
import type { Period } from '@/features/insights/insightsBuilder';
import { readCachedDashboard } from '@/storage/dashboardCache';

// The dashboards of the signed-in account, kept in memory for every range (1, 3 and 6 months). The app starts loading
// them as soon as the session is known, so Home opens with numbers and moving between ranges never waits. The server
// stays the source of truth: anything older than FRESH_MS is shown at once and fetched again behind it.
export const FRESH_MS = 2 * 60 * 1000;
export const PERIODS: readonly Period[] = [1, 3, 6];

type Entry = { data: DashboardData; at: number };

let owner: string | null = null;
const entries = new Map<Period, Entry>();
const inflight = new Map<Period, Promise<DashboardData>>();
const listeners = new Set<() => void>();
// Bumped when the store is reset, so an answer for a previous account is thrown away.
let generation = 0;

const notify = () => listeners.forEach((listener) => listener());

export function subscribeDashboards(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export const peekDashboard = (months: Period): DashboardData | null => entries.get(months)?.data ?? null;
export const isDashboardLoading = (months: Period): boolean => inflight.has(months);
const isFresh = (months: Period) => {
  const entry = entries.get(months);
  return !!entry && Date.now() - entry.at < FRESH_MS;
};

// Fetches one range. A request already running is shared; fresh data is not fetched again unless `force`.
export function loadDashboard(months: Period, { force = false }: { force?: boolean } = {}): Promise<DashboardData> {
  const running = inflight.get(months);
  if (running) return running;
  const entry = entries.get(months);
  if (entry && !force && isFresh(months)) return Promise.resolve(entry.data);

  const mine = generation;
  const request = getDashboard(months)
    .then((data) => {
      if (mine === generation) {
        entries.set(months, { data, at: Date.now() });
        notify();
      }
      return data;
    })
    .finally(() => {
      if (mine === generation) {
        inflight.delete(months);
        notify();
      }
    });
  inflight.set(months, request);
  notify();
  return request;
}

// Puts the copy saved on the phone into the store (for a range with nothing in memory yet), marked as old so it is
// fetched again. Returns it, or null when there is none.
export async function hydrateDashboard(userId: string | null, months: Period): Promise<DashboardData | null> {
  if (entries.has(months)) return entries.get(months)?.data ?? null;
  const mine = generation;
  const saved = await readCachedDashboard(userId, months);
  if (!saved || mine !== generation || entries.has(months)) return entries.get(months)?.data ?? null;
  entries.set(months, { data: saved, at: 0 });
  notify();
  return saved;
}

// Everything for this account, this month first. Never throws: a range that fails stays as it was.
export function prefetchDashboards(userId: string): Promise<void> {
  if (owner !== userId) resetDashboards();
  owner = userId;
  // The copy saved on the phone goes in first (a few milliseconds), the server's answers replace it as they arrive.
  PERIODS.forEach((months) => void hydrateDashboard(userId, months));
  const quiet = (months: Period) => loadDashboard(months).then(() => undefined, () => undefined);
  return Promise.all(PERIODS.map(quiet)).then(() => undefined);
}

// Something that changes the numbers happened (a transaction synced, added, deleted or recategorised, the app came
// back to the foreground): fetch every range again, without clearing what is on screen.
export function refreshDashboards({ onlyIfStale = false }: { onlyIfStale?: boolean } = {}): Promise<void> {
  if (!owner) return Promise.resolve();
  const quiet = (months: Period) =>
    (onlyIfStale && isFresh(months) ? Promise.resolve() : loadDashboard(months, { force: true })).then(
      () => undefined,
      () => undefined,
    );
  return Promise.all(PERIODS.map(quiet)).then(() => undefined);
}

export function resetDashboards(): void {
  generation += 1;
  owner = null;
  entries.clear();
  inflight.clear();
  notify();
}
