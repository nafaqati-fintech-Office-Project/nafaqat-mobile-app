import { describe, expect, it } from 'vitest';

import { levelOf, planLocalAlerts, planServerAlerts, topBudgetAlert } from './budgetAlerts';
import type { AppNotification } from './types';
import type { Budget } from '@/features/budget/types';

const alert = (id: string, over: Partial<AppNotification> = {}): AppNotification => ({
  id,
  type: 'BUDGET_THRESHOLD',
  severity: 'WARNING',
  title: id,
  message: '',
  referenceType: 'BUDGET',
  referenceId: 'b1',
  categoryCode: 'GROCERIES',
  read: false,
  createdAt: new Date(2026, 9, Number(id.replace(/\D/g, '')) || 1),
  ...over,
});

const category = (name: string, spent: string, limit: string) => ({
  category: name,
  spent,
  limit,
  remaining: '0',
  percent: 0,
  tone: 'ok' as const,
});

const budget = (over: Partial<Budget> = {}): Budget => ({
  id: 'b1',
  currency: 'PKR',
  startDate: new Date(2026, 9, 1),
  endDate: new Date(2026, 9, 31),
  spent: '0',
  limit: '10000',
  remaining: '0',
  percent: 0,
  tone: 'ok',
  catchingUp: false,
  categories: [category('Groceries', '0', '1000')],
  ...over,
});

const codeFor = (c: string) => (c === 'Groceries' ? 'GROCERIES' : null);

describe('levelOf', () => {
  it('warns from 80% and exceeds from 100%', () => {
    expect(levelOf(79)).toBeNull();
    expect(levelOf(80)).toBe('warning');
    expect(levelOf(99)).toBe('warning');
    expect(levelOf(100)).toBe('exceeded');
  });
});

describe('planServerAlerts', () => {
  it('records what is there on the first run without showing it', () => {
    const plan = planServerAlerts([alert('n1'), alert('n2', { type: 'BUDGET_EXCEEDED' })], null, {});
    expect(plan.show).toEqual([]);
    expect(plan.ids.sort()).toEqual(['n1', 'n2']);
    expect(plan.levels['b1:Groceries']).toBe('exceeded');
  });

  it('shows a new alert once', () => {
    const items = [alert('n2'), alert('n1')];
    const first = planServerAlerts(items, new Set(['n1']), {});
    expect(first.show.map((n) => n.id)).toEqual(['n2']);
    const again = planServerAlerts(items, new Set(['n1', 'n2']), first.levels);
    expect(again.show).toEqual([]);
    expect(again.ids).toEqual([]);
  });

  it('skips unread-only types it does not announce, and read ones', () => {
    const items = [
      alert('n3', { type: 'SECURITY_ALERT' }),
      alert('n4', { read: true }),
      alert('n5', { type: 'LARGE_TRANSACTION', referenceType: 'TRANSACTION', referenceId: 't1', categoryCode: null }),
    ];
    const plan = planServerAlerts(items, new Set(), {});
    expect(plan.show.map((n) => n.id)).toEqual(['n5']);
  });

  it('does not repeat a level the phone already announced', () => {
    const plan = planServerAlerts([alert('n6')], new Set(), { 'b1:Groceries': 'warning' });
    expect(plan.show).toEqual([]);
    expect(plan.ids).toEqual(['n6']);
  });

  it('still announces exceeded after a warning', () => {
    const plan = planServerAlerts([alert('n7', { type: 'BUDGET_EXCEEDED' })], new Set(), { 'b1:Groceries': 'warning' });
    expect(plan.show.map((n) => n.id)).toEqual(['n7']);
    expect(plan.levels['b1:Groceries']).toBe('exceeded');
  });

  it('keys an alert for the whole budget as overall', () => {
    const plan = planServerAlerts([alert('n8', { categoryCode: null })], new Set(), {});
    expect(plan.levels['b1:overall']).toBe('warning');
  });
});

describe('planLocalAlerts', () => {
  it('raises nothing under 80%', () => {
    const { alerts } = planLocalAlerts(budget(), { total: 700, byCategory: new Map([['Groceries', 700]]) }, {}, codeFor);
    expect(alerts).toEqual([]);
  });

  it('warns at 80% of a category and counts the phone figure when the server is behind', () => {
    const { alerts, levels } = planLocalAlerts(
      budget({ categories: [category('Groceries', '300', '1000')] }),
      { total: 900, byCategory: new Map([['Groceries', 850]]) },
      {},
      codeFor,
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ scope: 'Groceries', level: 'warning', percent: 85, spent: '850.00', limit: '1000.00', categoryCode: 'GROCERIES' });
    expect(levels['b1:Groceries']).toBe('warning');
  });

  it('uses the server figure when it is higher than the phone', () => {
    const { alerts } = planLocalAlerts(
      budget({ categories: [category('Groceries', '1200', '1000')] }),
      { total: 0, byCategory: new Map() },
      {},
      codeFor,
    );
    expect(alerts[0]).toMatchObject({ level: 'exceeded', percent: 120 });
  });

  it('announces each level once, then exceeded after warning', () => {
    const spending = { total: 0, byCategory: new Map([['Groceries', 850]]) };
    const first = planLocalAlerts(budget(), spending, {}, codeFor);
    expect(first.alerts).toHaveLength(1);
    expect(planLocalAlerts(budget(), spending, first.levels, codeFor).alerts).toEqual([]);

    const over = { total: 0, byCategory: new Map([['Groceries', 1100]]) };
    const next = planLocalAlerts(budget(), over, first.levels, codeFor);
    expect(next.alerts.map((a) => a.level)).toEqual(['exceeded']);
  });

  it('checks the whole budget too', () => {
    const { alerts } = planLocalAlerts(budget({ categories: [] }), { total: 10500, byCategory: new Map() }, {}, codeFor);
    expect(alerts[0]).toMatchObject({ scope: 'overall', level: 'exceeded', categoryCode: null });
  });

  it('ignores a limit of zero', () => {
    const { alerts } = planLocalAlerts(budget({ limit: '0', categories: [] }), { total: 50, byCategory: new Map() }, {}, codeFor);
    expect(alerts).toEqual([]);
  });
});

describe('topBudgetAlert', () => {
  it('picks the unread exceeded alert over a newer warning', () => {
    const items = [
      alert('n9', { createdAt: new Date(2026, 9, 28) }),
      alert('n8', { type: 'BUDGET_EXCEEDED', severity: 'CRITICAL', createdAt: new Date(2026, 9, 20) }),
      alert('n7', { type: 'BUDGET_EXCEEDED', read: true }),
      alert('n6', { type: 'SYSTEM' }),
    ];
    expect(topBudgetAlert(items)?.id).toBe('n8');
  });

  it('is null without an unread budget alert', () => {
    expect(topBudgetAlert([alert('n1', { read: true }), alert('n2', { type: 'SYSTEM' })])).toBeNull();
  });
});
