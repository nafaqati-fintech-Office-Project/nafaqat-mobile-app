import type { AssistantData } from './types';
import type { Report } from '@/features/reports/types';
import type { Language } from '@/i18n';

const MAX_ROWS = 8;

const monthKey = (r: Report) => `${r.period.year}-${String(r.period.month).padStart(2, '0')}`;
const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

// The compact summary sent with each question. Totals only: no ids, SMS text, card or account numbers,
// e-mail or username.
export function toContext(data: AssistantData, language: Language) {
  return {
    firstName: data.firstName,
    language,
    currency: data.currency,
    today: day(data.today),
    months: data.months.map((r, i) => ({
      month: monthKey(r),
      stillRunning: i === 0,
      currency: r.currency,
      income: r.income,
      spent: r.spent,
      net: r.net,
      savingsRatePercent: r.savingsRate,
      avgDaily: r.avgDaily,
      categories: r.categories.slice(0, MAX_ROWS).map((c) => ({ name: c.category, amount: c.amount, percent: c.percent })),
      essentialsVsLifestyle: r.lifestyle.map((l) => ({ group: l.group, amount: l.amount, percent: l.percent })),
      topMerchants: r.merchants.slice(0, MAX_ROWS).map((m) => ({ name: m.merchant, category: m.category, payments: m.count, amount: m.amount })),
      merchantsPartial: r.merchantsTruncated,
    })),
    budget: data.budget && {
      currency: data.budget.currency,
      spent: data.budget.spent,
      limit: data.budget.limit,
      percentUsed: data.budget.percent,
      categories: data.budget.categories.map((c) => ({ name: c.category, spent: c.spent, limit: c.limit, percentUsed: c.percent, status: c.tone })),
    },
    goals: data.goals.slice(0, 10).map((g) => ({
      name: g.name,
      currency: g.currency,
      target: g.targetAmount,
      saved: g.savedAmount,
      targetDate: day(g.targetDate),
    })),
    subscriptions: data.subscriptions.slice(0, 15).map((s) => ({
      name: s.name,
      currency: s.currency,
      monthlyCost: s.monthlyCost,
      cycle: s.cycle,
    })),
  };
}
