import { describe, expect, it, vi } from 'vitest';

import { notificationLink } from './notificationLink';
import { buildRecheckContent } from './notify';

vi.mock('./loadNotifications', () => ({ loadNotifications: async () => null }));

describe('recheck banner for uncategorized transactions', () => {
  it('names a single transaction and opens its category screen', () => {
    const content = buildRecheckContent([{ id: 42, label: 'ZQXJ WKVP', amount: '120.50', currency: 'SAR' }]);
    expect(content.title).toBe('Please check this transaction');
    expect(content.body).toContain('ZQXJ WKVP (120.50 SAR)');
    expect(notificationLink({ ...content.data, categoryCode: null })).toEqual({
      pathname: '/change-category',
      params: { id: '42' },
    });
  });

  it('turns several into one banner that opens the transaction list', () => {
    const content = buildRecheckContent([
      { id: 1, label: 'A' },
      { id: 2, label: 'B' },
      { id: 3, label: 'C' },
    ]);
    expect(content.title).toBe('3 transactions need a category');
    expect(notificationLink({ ...content.data, categoryCode: null })).toBe('/transactions');
  });

  it('opens the list when the row id is unknown', () => {
    const content = buildRecheckContent([{ id: null, label: 'A' }]);
    expect(notificationLink({ ...content.data, categoryCode: null })).toBe('/transactions');
  });
});
