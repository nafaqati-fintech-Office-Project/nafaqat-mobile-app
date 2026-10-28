import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getMonthlyComparison, getMonthlyTrend, getSpendingRows } from './insightsApi';

const get = vi.hoisted(() => vi.fn());
vi.mock('@/api/client', () => ({ api: { get } }));

beforeEach(() => {
  get.mockReset();
});

const txn = (id: string) => ({
  id,
  amount: 10,
  currency: 'SAR',
  type: 'DEBIT',
  merchant: 'Panda',
  category: 'Groceries',
  categoryCode: 'GROCERIES',
  transactionDate: '2026-10-05T10:00:00Z',
});
const page = (n: number, totalPages: number) => ({ content: [txn(`t${n}`)], page: n, size: 100, totalElements: 1, totalPages });

describe('getMonthlyTrend', () => {
  it('reads expenses and net per month and sends the zone', async () => {
    get.mockResolvedValue({
      data: {
        endMonth: '2026-10',
        months: 12,
        currencies: [
          {
            currency: 'SAR',
            months: [{ month: '2026-10', totalIncome: 7500, totalExpenses: 4250.5, net: 3249.5, savingsRate: 0.4333 }],
          },
        ],
      },
    });
    await expect(getMonthlyTrend('2026-10', 12, 'Asia/Riyadh')).resolves.toEqual([
      { currency: 'SAR', months: [{ month: '2026-10', expenses: 4250.5, net: 3249.5 }] },
    ]);
    expect(get).toHaveBeenCalledWith('/api/reports/monthly-trend', {
      params: { endMonth: '2026-10', months: 12, timeZone: 'Asia/Riyadh' },
    });
  });
});

describe('getMonthlyComparison', () => {
  it('reads both months and keeps a missing percent as null', async () => {
    const totals = { totalIncome: 0, totalExpenses: 300, net: -300, categories: [{ categoryCode: 'FUEL', category: 'Fuel', total: 300, count: 2 }] };
    get.mockResolvedValue({
      data: {
        month: '2026-10',
        previousMonth: '2026-09',
        currencies: [
          {
            currency: 'SAR',
            current: totals,
            previous: { totalIncome: 0, totalExpenses: 0, net: 0, categories: [] },
            delta: {
              net: { amount: -300, percent: null },
              categories: [{ categoryCode: 'FUEL', category: 'Fuel', amount: 300, percent: null }],
            },
          },
        ],
      },
    });
    const [sar] = await getMonthlyComparison('2026-10', 'UTC');
    expect(sar.current).toEqual({
      income: 0,
      expenses: 300,
      net: -300,
      categories: [{ code: 'FUEL', label: 'Fuel', total: 300 }],
    });
    expect(sar.netChangePercent).toBeNull();
    expect(sar.categoryChanges).toEqual([{ code: 'FUEL', label: 'Fuel', percent: null }]);
  });
});

describe('getSpendingRows', () => {
  const range = { startDate: '2026-10-01', endDate: '2026-10-31' };

  it('reads pages until the last one', async () => {
    get.mockResolvedValueOnce({ data: page(0, 2) }).mockResolvedValueOnce({ data: page(1, 2) });
    const result = await getSpendingRows(range, 'UTC');
    expect(result.rows.map((r) => r.id)).toEqual(['t0', 't1']);
    expect(result.truncated).toBe(false);
    expect(get.mock.calls[0][1].params).toMatchObject({ type: 'DEBIT', status: 'COMPLETED', ...range, page: 0, size: 100 });
  });

  it('stops after five pages and says the totals are partial', async () => {
    for (let n = 0; n < 5; n++) get.mockResolvedValueOnce({ data: page(n, 9) });
    const result = await getSpendingRows(range, 'UTC');
    expect(get).toHaveBeenCalledTimes(5);
    expect(result.truncated).toBe(true);
  });
});
