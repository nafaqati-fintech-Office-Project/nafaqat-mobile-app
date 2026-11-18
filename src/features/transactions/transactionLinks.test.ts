import { describe, expect, it, vi } from 'vitest';

import { canOpenCategory, monthsRange, openTransactions } from './transactionLinks';

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('expo-router', () => ({ router: { navigate } }));

describe('monthsRange', () => {
  it('covers one whole month, including February in a leap year', () => {
    expect(monthsRange(2026, 11)).toEqual({ from: '2026-11-01', to: '2026-11-30' });
    expect(monthsRange(2028, 2)).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });

  it('covers several months ending with the given one, across a year', () => {
    expect(monthsRange(2027, 2, 3)).toEqual({ from: '2026-12-01', to: '2027-02-28' });
  });
});

describe('openTransactions', () => {
  it('opens the Transactions tab with the filters and a fresh drill id', () => {
    openTransactions({ type: 'expenses', category: 'Groceries', from: '2026-11-01', to: '2026-11-30', title: 'Groceries' });
    expect(navigate).toHaveBeenCalledWith({
      pathname: '/transactions',
      params: expect.objectContaining({ type: 'expenses', category: 'Groceries', from: '2026-11-01', to: '2026-11-30', title: 'Groceries' }),
    });
    expect(navigate.mock.calls[0][0].params.drill).toMatch(/^\d+$/);
  });

  it('drops a category the server cannot filter by', () => {
    expect(canOpenCategory('Groceries')).toBe(true);
    expect(canOpenCategory('Person')).toBe(false);
    openTransactions({ category: 'Person', title: 'x' });
    expect(navigate.mock.calls.at(-1)?.[0].params.category).toBe('');
  });
});
