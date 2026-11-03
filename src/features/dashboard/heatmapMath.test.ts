import { describe, expect, it } from 'vitest';

import { buildCashFlow, buildHeatmap, buildSavingsTrend } from './dashboardBuilder';
import { heatLevel, lastMonths, monthGrid, savingsRate } from './heatmapMath';

describe('heatLevel', () => {
  it('is 0 without spending and 4 on the heaviest day', () => {
    expect(heatLevel(0, 100)).toBe(0);
    expect(heatLevel(100, 100)).toBe(4);
    expect(heatLevel(5, 0)).toBe(0);
  });

  it('never shades a day with spending as empty', () => {
    expect(heatLevel(1, 1000)).toBe(1);
    expect(heatLevel(260, 1000)).toBe(2);
    expect(heatLevel(760, 1000)).toBe(4);
  });
});

describe('monthGrid', () => {
  it('starts the week on Monday', () => {
    expect(monthGrid(2026, 10)).toEqual({ offset: 3, daysInMonth: 31 }); // 1 Oct 2026 is a Thursday
    expect(monthGrid(2026, 6)).toEqual({ offset: 0, daysInMonth: 30 }); // 1 Jun 2026 is a Monday
    expect(monthGrid(2028, 2).daysInMonth).toBe(29);
  });
});

describe('lastMonths', () => {
  it('lists six months oldest first and crosses the year', () => {
    expect(lastMonths(2026, 2)).toEqual([
      { year: 2025, month: 9 },
      { year: 2025, month: 10 },
      { year: 2025, month: 11 },
      { year: 2025, month: 12 },
      { year: 2026, month: 1 },
      { year: 2026, month: 2 },
    ]);
  });
});

describe('savingsRate', () => {
  it('is the share of income kept, negative when overspent, null without income', () => {
    expect(savingsRate(12000, 7750)).toBe(65);
    expect(savingsRate(1000, -500)).toBe(-50);
    expect(savingsRate(0, -500)).toBeNull();
  });
});

describe('buildHeatmap', () => {
  const rows = [
    { currency: 'PKR', days: [{ date: '2026-10-02', total: 100 }, { date: '2026-10-05', total: 400 }] },
    { currency: 'SAR', days: [{ date: '2026-10-09', total: 9999 }] },
  ];

  it('covers every day of the month for the chosen currency only', () => {
    const { offset, days } = buildHeatmap({ year: 2026, month: 10 }, rows, 'PKR');
    expect(offset).toBe(3);
    expect(days).toHaveLength(31);
    expect(days[1]).toEqual({ day: 2, amount: '100.00', level: 1 });
    expect(days[4]).toEqual({ day: 5, amount: '400.00', level: 4 });
    expect(days[8]).toEqual({ day: 9, amount: '0.00', level: 0 });
  });

  it('is all empty when there is no data', () => {
    expect(buildHeatmap({ year: 2026, month: 10 }, [], 'PKR').days.every((d) => d.level === 0)).toBe(true);
  });
});

describe('buildCashFlow', () => {
  it('reports income, expenses, net and the rate', () => {
    expect(buildCashFlow({ currency: 'PKR', totalIncome: 12000, totalExpenses: 4250, net: 7750 }, 'PKR')).toEqual({
      income: '12000.00',
      expenses: '4250.00',
      net: '7750.00',
      savingsRate: 65,
    });
  });

  it('shows zeros and no rate for a month without data', () => {
    expect(buildCashFlow(undefined, 'KWD')).toEqual({
      income: '0.000',
      expenses: '0.000',
      net: '0.000',
      savingsRate: null,
    });
  });
});

describe('buildSavingsTrend', () => {
  it('takes the net of the currency per month and counts a missing month as 0', () => {
    const trend = buildSavingsTrend(
      [
        { year: 2026, month: 9, rows: [{ currency: 'PKR', totalIncome: 100, totalExpenses: 300, net: -200 }] },
        { year: 2026, month: 10, rows: [] },
      ],
      'PKR',
    );
    expect(trend).toEqual([
      { year: 2026, month: 9, net: '-200.00' },
      { year: 2026, month: 10, net: '0.00' },
    ]);
  });
});
