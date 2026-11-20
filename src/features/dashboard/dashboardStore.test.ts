import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getDashboard } from './dashboardService';
import {
  isDashboardLoading,
  loadDashboard,
  peekDashboard,
  prefetchDashboards,
  refreshDashboards,
  resetDashboards,
} from './dashboardStore';
import type { DashboardData } from './types';

vi.mock('./dashboardService', () => ({ getDashboard: vi.fn() }));
vi.mock('@/storage/dashboardCache', () => ({ readCachedDashboard: vi.fn(async () => null) }));

const service = vi.mocked(getDashboard);
const dashboard = (total: string, months = 1) => ({ totalSpending: total, months }) as unknown as DashboardData;

beforeEach(() => {
  resetDashboards();
  vi.resetAllMocks();
  service.mockImplementation(async (months = 1) => dashboard('7000.00', months));
});

describe('dashboardStore', () => {
  it('loads every range once, up front, so switching ranges needs no request', async () => {
    await prefetchDashboards('u1');
    expect(service.mock.calls.map((call) => call[0]).sort()).toEqual([1, 3, 6]);
    expect(peekDashboard(1)?.totalSpending).toBe('7000.00');
    expect(peekDashboard(3)?.months).toBe(3);
    expect(peekDashboard(6)?.months).toBe(6);
    await loadDashboard(3);
    expect(service).toHaveBeenCalledTimes(3); // fresh data is not fetched again
  });

  it('shares a request that is already running', async () => {
    const first = loadDashboard(1);
    const second = loadDashboard(1);
    expect(isDashboardLoading(1)).toBe(true);
    await Promise.all([first, second]);
    expect(service).toHaveBeenCalledTimes(1);
    expect(isDashboardLoading(1)).toBe(false);
  });

  it('keeps the old numbers on screen while it fetches again, then replaces them', async () => {
    await prefetchDashboards('u1');
    service.mockImplementation(async (months = 1) => dashboard('7500.00', months));
    const again = refreshDashboards();
    expect(peekDashboard(1)?.totalSpending).toBe('7000.00');
    await again;
    expect(peekDashboard(1)?.totalSpending).toBe('7500.00');
  });

  it('keeps what it has when a refresh fails', async () => {
    await prefetchDashboards('u1');
    service.mockRejectedValue(new Error('offline'));
    await refreshDashboards();
    expect(peekDashboard(1)?.totalSpending).toBe('7000.00');
  });

  it('does not refetch fresh ranges when the app comes back to the foreground', async () => {
    await prefetchDashboards('u1');
    await refreshDashboards({ onlyIfStale: true });
    expect(service).toHaveBeenCalledTimes(3);
  });

  it('drops everything when the account changes or signs out', async () => {
    await prefetchDashboards('u1');
    await prefetchDashboards('u2');
    expect(service).toHaveBeenCalledTimes(6);
    resetDashboards();
    expect(peekDashboard(1)).toBeNull();
  });

  it('ignores an answer that arrives after sign out', async () => {
    let finish: (value: DashboardData) => void = () => undefined;
    service.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const pending = loadDashboard(1);
    resetDashboards();
    finish(dashboard('9999.00'));
    await pending;
    expect(peekDashboard(1)).toBeNull();
  });
});
