import { describe, expect, it, vi } from 'vitest';

import { familyProblem, parseDashboard, parseFamily, parseInvitation, parseShared, parseUtilization } from './familyApi';
import { canRemoveMember, invitableRoles, isUuid, memberTag, permissionsFor } from './familyUtils';
import type { Member } from './types';

vi.mock('@/api/client', () => ({ api: {} }));

const family = {
  id: 'f1',
  name: 'Khan family',
  description: null,
  currency: 'SAR',
  timeZone: 'Asia/Riyadh',
  myRole: 'OWNER',
  version: 3,
};

describe('parsing what the family services send', () => {
  it('reads a family', () => {
    expect(parseFamily(family)).toEqual({
      id: 'f1',
      name: 'Khan family',
      description: null,
      currency: 'SAR',
      timeZone: 'Asia/Riyadh',
      myRole: 'OWNER',
    });
  });

  it('refuses a role it does not know', () => {
    expect(() => parseFamily({ ...family, myRole: 'BOSS' })).toThrow();
  });

  it('reads an invitation', () => {
    const body = { id: 'i1', familyId: 'f1', familyName: 'Khan family', invitedUserId: 'u2', role: 'MEMBER', status: 'PENDING' };
    expect(parseInvitation(body).familyName).toBe('Khan family');
  });

  it('reads a shared transaction, with amounts kept as decimal strings', () => {
    const tx = parseShared({
      id: 't1',
      sharedBy: 'u1',
      amount: 28.5,
      currency: 'SAR',
      categoryCode: 'GROCERIES',
      merchant: null,
      transactionDate: '2026-10-28T07:24:00Z',
    });
    expect(tx.amount).toBe('28.5');
    expect(tx.merchant).toBeNull();
    expect(tx.date.toISOString()).toBe('2026-10-28T07:24:00.000Z');
  });

  it('reads a dashboard with an active budget', () => {
    const dashboard = parseDashboard({
      period: { month: '2026-10' },
      currency: 'SAR',
      activeMemberCount: 3,
      totalSharedSpending: 1200.5,
      sharedTransactionCount: 14,
      budget: {
        state: 'AVAILABLE',
        budgetId: 'b1',
        budgetedAmount: 2000,
        spentAmount: 1200.5,
        remainingAmount: 799.5,
        utilizationPercent: 60.02,
        status: 'ON_TRACK',
      },
      spendingByCategory: [{ categoryCode: 'GROCERIES', total: 600, transactionCount: 5, sharePercent: 49.98 }],
      previousMonth: { month: '2026-09', totalSharedSpending: 1000, sharedTransactionCount: 9, changePercent: 20.05 },
      excludedOtherCurrencies: [{ currency: 'PKR', transactionCount: 2 }],
    });
    expect(dashboard.totalShared).toBe('1200.5');
    expect(dashboard.budget).toMatchObject({ state: 'available', budgetId: 'b1', status: 'ON_TRACK' });
    expect(dashboard.changePercent).toBe(20.05);
    expect(dashboard.otherCurrencies).toEqual([{ currency: 'PKR', count: 2 }]);
  });

  it('tells "no active budget" from "could not be worked out"', () => {
    const base = { period: { month: '2026-10' }, currency: 'SAR', activeMemberCount: 1, totalSharedSpending: 0, sharedTransactionCount: 0, spendingByCategory: [] };
    expect(parseDashboard({ ...base, budget: { state: 'NOT_AVAILABLE', reason: 'NO_ACTIVE_BUDGET' } }).budget).toEqual({ state: 'none' });
    expect(parseDashboard({ ...base, budget: { state: 'NOT_AVAILABLE', reason: 'TRANSACTION_SERVICE_DOWN' } }).budget).toEqual({ state: 'unavailable' });
    expect(parseDashboard({ ...base, budget: { state: 'NOT_AVAILABLE', reason: 'NO_ACTIVE_BUDGET' }, previousMonth: null }).changePercent).toBeNull();
  });

  it('reads the budget with its category lines', () => {
    const utilization = parseUtilization({
      currency: 'SAR',
      totalLimit: 2000,
      totalSpent: 2100,
      percentageUsed: 105,
      usageStatus: 'EXCEEDED',
      categories: [{ category: 'FUEL', limitAmount: 500, spentAmount: 300, percentageUsed: 60, usageStatus: 'ON_TRACK' }],
    });
    expect(utilization.status).toBe('EXCEEDED');
    expect(utilization.lines[0]).toEqual({ categoryCode: 'FUEL', limit: '500', spent: '300', percent: 60, status: 'ON_TRACK' });
  });
});

describe('what a role may do', () => {
  const member = (role: Member['role'], userId = 'u2'): Member => ({ id: `m-${userId}`, userId, role });

  it('lets the owner do everything except leave, and an admin manage members only', () => {
    expect(permissionsFor('OWNER')).toMatchObject({ invite: true, inviteAdmin: true, delete: true, transfer: true, leave: false });
    expect(permissionsFor('ADMIN')).toMatchObject({ invite: true, inviteAdmin: false, delete: false, changeRole: false, leave: true });
    expect(permissionsFor('MEMBER')).toMatchObject({ invite: false, remove: false, leave: true });
  });

  it('decides who may remove whom', () => {
    expect(canRemoveMember('OWNER', member('ADMIN'), 'u1')).toBe(true);
    expect(canRemoveMember('ADMIN', member('MEMBER'), 'u1')).toBe(true);
    expect(canRemoveMember('ADMIN', member('ADMIN'), 'u1')).toBe(false);
    expect(canRemoveMember('OWNER', member('OWNER'), 'u1')).toBe(false);
    expect(canRemoveMember('OWNER', member('MEMBER', 'u1'), 'u1')).toBe(false);
    expect(canRemoveMember('MEMBER', member('MEMBER'), 'u1')).toBe(false);
  });

  it('offers the roles a person may invite', () => {
    expect(invitableRoles('OWNER')).toEqual(['MEMBER', 'ADMIN']);
    expect(invitableRoles('ADMIN')).toEqual(['MEMBER']);
    expect(invitableRoles('MEMBER')).toEqual([]);
  });

  it('shortens an id and checks that one is a UUID', () => {
    expect(memberTag('6f1c0f0e-1111-4444-8888-1234567890ab')).toBe('…90ab');
    expect(isUuid('6f1c0f0e-1111-4444-8888-1234567890ab')).toBe(true);
    expect(isUuid('not-an-id')).toBe(false);
  });
});

describe('familyProblem', () => {
  it('says what kind of problem a failed request was, without the server text', () => {
    const failure = (status?: number) => Object.assign(new Error('x'), { isAxiosError: true, response: status ? { status } : undefined });
    expect(familyProblem(failure())).toBe('network');
    expect(familyProblem(failure(403))).toBe('forbidden');
    expect(familyProblem(failure(404))).toBe('notFound');
    expect(familyProblem(failure(409))).toBe('conflict');
    expect(familyProblem(failure(503))).toBe('unavailable');
    expect(familyProblem(new Error('plain'))).toBe('unknown');
  });
});
