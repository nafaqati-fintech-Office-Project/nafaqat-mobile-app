import { afterEach, describe, expect, it } from 'vitest';

import { toContext } from './assistantSummary';
import { answerQuestion, cutOptions, detectIntent, findGoal, freeCashFlow, planGoal, risingCategories } from './assistantFacts';
import type { AssistantData } from './types';
import type { Goal } from '@/features/goals/types';
import { mockReport } from '@/features/reports/mock';
import type { Report } from '@/features/reports/types';
import type { Subscription } from '@/features/subscriptions/types';
import { setCurrentLanguage } from '@/i18n';

const TODAY = new Date(2026, 10, 3); // 3 November 2026

function month(month: number, changes: Partial<Report> = {}): Report {
  return { ...mockReport({ year: 2026, month }), ...changes };
}

function goal(changes: Partial<Goal> = {}): Goal {
  return {
    id: 'g1',
    name: 'Dubai vacation',
    description: null,
    targetAmount: '6000.00',
    savedAmount: '2500.00',
    currency: 'SAR',
    targetDate: new Date(2026, 11, 3), // 30 days after TODAY
    status: 'ACTIVE',
    createdAt: new Date(2026, 0, 1),
    autoSave: false,
    autoSaveKeyword: null,
    ...changes,
  };
}

const netflix: Subscription = {
  id: 's1',
  name: 'Netflix',
  amount: '45.00',
  currency: 'SAR',
  cycle: 'MONTHLY',
  status: 'CONFIRMED',
  source: 'DETECTED',
  lastChargeDate: null,
  nextDate: null,
  previousAmount: null,
  monthlyCost: '45.00',
  overdue: false,
};

function data(changes: Partial<AssistantData> = {}): AssistantData {
  return {
    firstName: 'Sara',
    currency: 'SAR',
    today: TODAY,
    // mockReport: spent 4250, income 5450, net 1200 a month.
    months: [month(11), month(10), month(9)],
    budget: null,
    goals: [goal()],
    subscriptions: [netflix],
    ...changes,
  };
}

afterEach(() => setCurrentLanguage('en'));

describe('detectIntent', () => {
  it.each([
    ['How much did I spend on coffee last month?', 'spendOn'],
    ['What are my top 5 expenses?', 'topExpenses'],
    ['Where can I cut expenses?', 'cut'],
    ['I want to go to Dubai on vacation in a month', 'goal'],
    ['How should I invest my savings?', 'invest'],
    ['How is my budget?', 'budget'],
    ['Which categories are rising?', 'rising'],
    ['كم صرفت على القهوة الشهر الماضي؟', 'spendOn'],
    ['ما أكبر 5 مصروفات لدي؟', 'topExpenses'],
    ['hello', 'overview'],
  ])('%s -> %s', (question, intent) => {
    expect(detectIntent(question)).toBe(intent);
  });
});

describe('spending questions', () => {
  it('adds up coffee shops for last month', () => {
    const answer = answerQuestion('How much did I spend on coffee last month?', data(), 'en');
    expect(answer.facts[0]).toBe('Spent at Starbucks in 2026-10: SAR 392.00 over 14 payments.');
    expect(answer.fallback).toContain('SAR 392');
    expect(answer.fallback).toContain('October');
  });

  it('answers a category total', () => {
    const answer = answerQuestion('How much did I spend on groceries?', data(), 'en');
    expect(answer.facts[0]).toContain('Groceries in 2026-11: SAR 980.00');
  });

  it('lists the top N merchants, largest first', () => {
    const answer = answerQuestion('What are my top 3 expenses?', data(), 'en');
    expect(answer.facts[0]).toBe('Top 3 merchants by spending in 2026-11: 1. Panda SAR 980.00; 2. Starbucks SAR 392.00; 3. Uber SAR 388.00');
    expect(answer.fallback.split('\n')).toHaveLength(4);
  });

  it('answers in Arabic for the fallback', () => {
    setCurrentLanguage('ar');
    const answer = answerQuestion('كم صرفت على البقالة؟', data(), 'ar');
    expect(answer.fallback).toContain('بقالة');
    expect(answer.fallback).toContain('نوفمبر');
    expect(answer.fallback).toContain('صرفت');
  });
});

describe('patterns and cuts', () => {
  it('finds categories that rose by 10% or more', () => {
    const earlier = month(9, { categories: [{ category: 'Food & Beverage', amount: '500.00', percent: 12 }] });
    const rows = risingCategories(month(10), earlier);
    expect(rows[0]).toMatchObject({ category: 'Housing', percent: null });
    expect(rows.find((r) => r.category === 'Food & Beverage')).toMatchObject({ percent: 44 });
  });

  it('ranks lifestyle trims and subscriptions by saving', () => {
    // Last finished month: Food & Beverage 720 (25% = 180), Entertainment 200 (50), Netflix 45.
    expect(cutOptions(data())).toEqual([
      { kind: 'category', name: 'Food & Beverage', saving: 18000 },
      { kind: 'category', name: 'Entertainment', saving: 5000 },
      { kind: 'subscription', name: 'Netflix', saving: 4500 },
    ]);
  });
});

describe('goal planning', () => {
  it('uses the average net of finished months as free cash flow', () => {
    expect(freeCashFlow(data())).toBe(120000);
  });

  it('plans the Dubai goal: realistic when the usual surplus covers it', () => {
    // Remaining 3500 in 30 days; usual surplus 1200 a month -> about 1200 by then: short by 2300.
    const plan = planGoal(goal(), data());
    expect(plan).toMatchObject({ remaining: 350000, daysLeft: 30, perDay: 11667, perWeek: 81667, perMonth: 350000 });
    expect(plan.availableByDate).toBe(120000);
    expect(plan.realistic).toBe(false);
    expect(plan.gap).toBe(230000);
    // All cuts together save 275 a month, less than the 2300 gap, so every one is listed.
    expect(plan.cuts.map((c) => c.name)).toEqual(['Food & Beverage', 'Entertainment', 'Netflix']);
  });

  it('is realistic with enough time', () => {
    const plan = planGoal(goal({ targetDate: new Date(2027, 3, 1) }), data()); // 149 days
    expect(plan.daysLeft).toBe(149);
    expect(plan.realistic).toBe(true);
    expect(plan.gap).toBe(0);
    expect(plan.cuts).toEqual([]);
  });

  it('stops listing cuts once the gap is covered', () => {
    // Remaining 1400 in 60 days with a surplus of 600 a month: 1200 by then.
    const thin = data({ months: [month(11), month(10, { net: '600.00' }), month(9, { net: '600.00' })] });
    const plan = planGoal(goal({ savedAmount: '4600.00', targetDate: new Date(2027, 0, 2) }), thin); // 60 days
    expect(plan.availableByDate).toBe(120000);
    expect(plan.gap).toBe(20000); // 1400 - 1200
    // 200 over 60 days is 100 a month: the first cut (180) covers it.
    expect(plan.cuts.map((c) => c.name)).toEqual(['Food & Beverage']);
  });

  it('without a date says how many months the usual pace takes', () => {
    const plan = planGoal(goal({ targetDate: null }), data());
    expect(plan.monthsAtPace).toBe(3); // 3500 / 1200
    expect(plan.perDay).toBeNull();
  });

  it('finds a goal by a word of its name, or the only one', () => {
    const goals = [goal(), goal({ id: 'g2', name: 'New car' })];
    expect(findGoal('Can I afford Dubai?', goals)?.id).toBe('g1');
    expect(findGoal('my goal', goals)).toBeNull();
    expect(findGoal('my goal', [goal()])?.id).toBe('g1');
  });

  it('turns the plan into facts and an add-to-goal button', () => {
    const answer = answerQuestion('I want to go to Dubai on vacation in a month, how much should I save?', data(), 'en');
    expect(answer.intent).toBe('goal');
    expect(answer.facts).toContain('Needed: SAR 116.67 a day, SAR 816.67 a week, SAR 3500.00 a month.');
    expect(answer.facts.some((f) => f.includes('short by SAR 2300.00'))).toBe(true);
    expect(answer.actions[0]).toEqual({ id: 'add_to_goal', goalId: 'g1', goalName: 'Dubai vacation' });
  });
});

describe('investing', () => {
  it('gives general steps with a disclaimer and emergency-fund figures', () => {
    const answer = answerQuestion('How should I invest?', data(), 'en');
    expect(answer.facts[1]).toBe('Emergency fund of 3 to 6 months of spending: SAR 12750.00 to SAR 25500.00.');
    expect(answer.fallback).toContain('not licensed financial advice');
  });
});

describe('toContext', () => {
  it('carries totals but no ids or account details', () => {
    const context = toContext(data(), 'en');
    const text = JSON.stringify(context);
    expect(context.months).toHaveLength(3);
    expect(context.months[0].stillRunning).toBe(true);
    expect(text).not.toContain('"id"');
    expect(text).not.toContain('g1');
    expect(text).not.toContain('s1');
  });
});
