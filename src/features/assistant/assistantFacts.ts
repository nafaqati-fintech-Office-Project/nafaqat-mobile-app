import type { Answer, AssistantAction, AssistantData, Intent } from './types';
import type { Goal } from '@/features/goals/types';
import { lifestyleGroup } from '@/features/reports/reportBuilder';
import type { Report } from '@/features/reports/types';
import { fromMinor, toMinor } from '@/features/subscriptions/subscriptionMath';
import { categoryLabelKey } from '@/features/transactions/categoryDisplay';
import { t, type Language, type TranslationKey } from '@/i18n';
import { monthName } from '@/utils/intl';
import { formatMoney } from '@/utils/money';

// The assistant's numbers come from here, never from the model: it works out the exact figures for
// a question, and the model only puts them into words. When the model cannot be reached the
// fallback text is shown as it is.

const DAY_MS = 86_400_000;
// Suggested trim of a lifestyle category when looking for cuts.
const CUT_SHARE = 0.25;
const MAX_ROWS = 5;

// Words that point at a category, in English and Arabic.
const CATEGORY_WORDS: [RegExp, string][] = [
  [/restaurant|food|eat|dining|lunch|dinner|مطعم|مطاعم|طعام|أكل/i, 'Food & Beverage'],
  [/grocer|supermarket|بقال|سوبر ?ماركت|تموين/i, 'Groceries'],
  [/fuel|petrol|gasoline|بنزين|وقود/i, 'Fuel'],
  [/transport|taxi|uber|careem|ride|مواصلات|تاكسي|نقل/i, 'Transportation'],
  [/shopping|cloth|fashion|تسوق|ملابس|أزياء/i, 'Clothing & Shopping'],
  [/entertain|cinema|movie|game|ترفيه|سينما|ألعاب/i, 'Entertainment'],
  [/subscription|اشتراك/i, 'Subscriptions'],
  [/travel|flight|hotel|سفر|طيران|فندق/i, 'Travel'],
  [/health|pharmac|doctor|hospital|صحة|صيدلي|طبيب|مستشفى/i, 'Health'],
  [/utilit|electric|water bill|internet|phone bill|فواتير|كهرباء|ماء|إنترنت/i, 'Utilities'],
  [/rent|housing|إيجار|سكن/i, 'Housing'],
  [/educat|school|tuition|course|تعليم|مدرس|دراس/i, 'Education'],
  [/loan|emi|instal|قرض|قسط|أقساط/i, 'Loans/EMI'],
  [/charity|donat|zakat|sadaqah|صدق|تبرع|زكاة/i, 'Charity'],
];

// Coffee is asked about often but is not a category: it is matched on shop names.
const COFFEE_WORD = /coffee|cafe|café|latte|قهوة|كافيه|كوفي/i;
const COFFEE_SHOP =
  /coffee|cafe|café|starbucks|costa|tim hortons|dunkin|barn'?s|caribou|dose|half million|arabica|espresso|brew|قهوة|كوفي|كافيه/i;

const INTENTS: [Intent, RegExp][] = [
  ['invest', /invest|stock|shares|fund|crypto|استثمار|أستثمر|أسهم|صندوق|صناديق/i],
  ['goal', /\bgoals?\b|vacation|holiday|trip|save up|saving for|save for|saved for|afford|هدف|أهداف|إجازة|رحلة|عطلة/i],
  ['cut', /\bcut|reduce|spend less|save money|where can i save|cheaper|lower my|تقليل|أقلل|قلل|أخفض|توفير|أوفر/i],
  ['subscriptions', /subscription|اشتراك/i],
  ['budget', /budget|limit|ميزانية|الحد/i],
  ['topExpenses', /\btop\b|biggest|largest|most expensive|highest|أكبر|أعلى|أغلى/i],
  ['rising', /rising|increas|going up|grew|overspend|زاد|زيادة|ارتفع|ارتفاع|تجاوز/i],
  ['compare', /compar|\bvs\b|versus|than last|difference|مقارنة|قارن|مقابل/i],
  ['savings', /savings rate|how much (did i|have i) save|kept|saved|نسبة الادخار|ادخرت|وفرت/i],
  ['spendOn', /spen[dt]|cost|paid|pay for|how much|صرفت|أنفقت|دفعت|كم/i],
];

const LAST_MONTH = /last month|previous month|past month|الشهر الماضي|الشهر السابق|الشهر اللي فات/i;

type Ctx = { data: AssistantData; language: Language; currency: string };

const say = (key: TranslationKey, params?: Record<string, string>) => t(key, params);
const minor = (amount: string, ctx: Ctx) => toMinor(amount, ctx.currency);
const plain = (value: number, ctx: Ctx) => `${ctx.currency} ${fromMinor(value, ctx.currency)}`;
const shown = (value: number, ctx: Ctx, currency = ctx.currency) =>
  formatMoney(fromMinor(value, currency), currency, ctx.language);
const categoryName = (category: string) => {
  const key = categoryLabelKey(category);
  return key ? t(key) : category;
};
const monthOf = (report: Report, ctx: Ctx) => monthName(report.period.month, report.period.year, ctx.language);
const monthEn = (report: Report) => `${report.period.year}-${String(report.period.month).padStart(2, '0')}`;
const lines = (...parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join('\n');

export function detectIntent(question: string): Intent {
  return INTENTS.find(([, pattern]) => pattern.test(question))?.[0] ?? 'overview';
}

function pickMonth(question: string, data: AssistantData): Report | null {
  if (LAST_MONTH.test(question)) return data.months[1] ?? null;
  return data.months[0] ?? null;
}

// The last month that is over, for patterns and cuts; this month only when it is all there is.
const fullMonth = (data: AssistantData) => data.months[1] ?? data.months[0] ?? null;

// Average money left over a month (income minus spending) across the finished months; null without data.
export function freeCashFlow(data: AssistantData): number | null {
  const finished = data.months.slice(1).filter((m) => m.currency === data.currency);
  const source = finished.length ? finished : data.months.filter((m) => m.currency === data.currency);
  if (!source.length) return null;
  const total = source.reduce((sum, m) => sum + toMinor(m.net, data.currency), 0);
  return Math.round(total / source.length);
}

function averageSpent(data: AssistantData): number | null {
  const finished = data.months.slice(1).filter((m) => m.currency === data.currency);
  const source = finished.length ? finished : data.months.filter((m) => m.currency === data.currency);
  if (!source.length) return null;
  return Math.round(source.reduce((sum, m) => sum + toMinor(m.spent, data.currency), 0) / source.length);
}

// ---------- spending on something ----------

function spendOn(question: string, ctx: Ctx): Answer {
  const report = pickMonth(question, ctx.data);
  if (!report) return noData(ctx, 'spendOn');
  const month = monthOf(report, ctx);
  const actions: AssistantAction[] = [{ id: 'view_transactions' }];

  // A shop the user named, or coffee shops.
  const coffee = COFFEE_WORD.test(question);
  const named = report.merchants.filter((m) => m.merchant.length >= 3 && question.toLowerCase().includes(m.merchant.toLowerCase()));
  const shops = coffee ? report.merchants.filter((m) => COFFEE_SHOP.test(m.merchant)) : named;
  if (shops.length) {
    const total = shops.reduce((sum, m) => sum + minor(m.amount, ctx), 0);
    const count = shops.reduce((sum, m) => sum + m.count, 0);
    const names = shops.slice(0, 4).map((m) => m.merchant).join(', ');
    return {
      intent: 'spendOn',
      facts: [
        `Spent at ${names} in ${monthEn(report)}: ${plain(total, ctx)} over ${count} payments.`,
        report.merchantsTruncated ? 'Shop totals are partial for this month (more payments than the app reads).' : '',
      ].filter(Boolean),
      fallback: lines(
        say('assistant.f.spendMerchant', { amount: shown(total, ctx), merchants: names, month, count: String(count) }),
        report.merchantsTruncated && say('assistant.f.partial'),
      ),
      actions,
    };
  }

  const category = coffee ? 'Food & Beverage' : findCategory(question);
  if (category) {
    const row = report.categories.find((c) => c.category === category);
    if (!row) {
      return {
        intent: 'spendOn',
        facts: [`No spending in ${category} in ${monthEn(report)}.`],
        fallback: say('assistant.f.spendNone', { target: categoryName(category), month }),
        actions,
      };
    }
    return {
      intent: 'spendOn',
      facts: [
        `Spent on ${category} in ${monthEn(report)}: ${report.currency} ${row.amount} (${row.percent}% of the month's spending).`,
        coffee ? 'No coffee shop was found by name, so this is the whole Food & Beverage category.' : '',
      ].filter(Boolean),
      fallback: lines(
        say('assistant.f.spendCategory', { amount: formatMoney(row.amount, report.currency, ctx.language), category: categoryName(category), month }),
        coffee && say('assistant.f.coffeeAsFood'),
      ),
      actions,
    };
  }

  // No target named: the month's total.
  return {
    intent: 'spendOn',
    facts: [`Total spent in ${monthEn(report)}: ${report.currency} ${report.spent}.`],
    fallback: lines(
      say('assistant.f.spendTotal', { amount: formatMoney(report.spent, report.currency, ctx.language), month }),
      say('assistant.f.spendWhat'),
    ),
    actions: [{ id: 'view_reports' }],
  };
}

function findCategory(question: string): string | null {
  for (const [pattern, category] of CATEGORY_WORDS) if (pattern.test(question)) return category;
  return null;
}

// ---------- top expenses ----------

function topExpenses(question: string, ctx: Ctx): Answer {
  const report = pickMonth(question, ctx.data);
  if (!report) return noData(ctx, 'topExpenses');
  const n = Math.min(Math.max(Number(/(\d+)/.exec(question)?.[1] ?? MAX_ROWS), 1), 10);
  const month = monthOf(report, ctx);
  const byShop = report.merchantsState === 'ready' && report.merchants.length > 0;
  const rows = byShop
    ? [...report.merchants].sort((a, b) => minor(b.amount, ctx) - minor(a.amount, ctx)).slice(0, n).map((m) => ({ name: m.merchant, amount: m.amount }))
    : report.categories.slice(0, n).map((c) => ({ name: categoryName(c.category), amount: c.amount }));
  if (!rows.length) return noData(ctx, 'topExpenses', report);

  return {
    intent: 'topExpenses',
    facts: [
      `Top ${rows.length} ${byShop ? 'merchants' : 'categories'} by spending in ${monthEn(report)}: ` +
        rows.map((r, i) => `${i + 1}. ${r.name} ${report.currency} ${r.amount}`).join('; '),
      report.biggest ? `Biggest single payment: ${report.biggest.merchant ?? report.biggest.category} ${report.currency} ${report.biggest.amount}.` : '',
    ].filter(Boolean),
    fallback: lines(
      say('assistant.f.top', { n: String(rows.length), month }),
      ...rows.map((r, i) =>
        say('assistant.f.row', { rank: String(i + 1), name: r.name, amount: formatMoney(r.amount, report.currency, ctx.language) }),
      ),
    ),
    actions: [{ id: 'view_reports' }],
  };
}

// ---------- month comparison and rising categories ----------

function changeText(percent: number | null) {
  if (percent === null || Math.abs(percent) < 1) return say('assistant.f.same');
  return say(percent > 0 ? 'assistant.f.more' : 'assistant.f.less', { percent: String(Math.abs(percent)) });
}

function compare(ctx: Ctx): Answer {
  const [current, previous] = ctx.data.months;
  if (!current || !previous) return noData(ctx, 'compare', current);
  const c = current.comparison;
  const money = (amount: string) => formatMoney(amount, current.currency, ctx.language);
  return {
    intent: 'compare',
    facts: [
      `${monthEn(current)} so far (month still running) vs ${monthEn(previous)}: spent ${current.currency} ${c.expenses.current} vs ${c.expenses.previous} (${c.expenses.changePercent ?? 'n/a'}%), ` +
        `income ${c.income.current} vs ${c.income.previous}, net ${c.net.current} vs ${c.net.previous}.`,
    ],
    fallback: say('assistant.f.compare', {
      previous: monthOf(previous, ctx),
      spent: money(c.expenses.current),
      change: changeText(c.expenses.changePercent),
      income: money(c.income.current),
      net: money(c.net.current),
    }),
    actions: [{ id: 'view_reports' }],
  };
}

export function risingCategories(later: Report, earlier: Report) {
  return later.categories
    .map((row) => {
      const before = earlier.categories.find((c) => c.category === row.category);
      const now = toMinor(row.amount, later.currency);
      const then = before ? toMinor(before.amount, earlier.currency) : 0;
      const percent = then > 0 ? Math.round(((now - then) / then) * 100) : null;
      return { category: row.category, amount: row.amount, increase: now - then, percent };
    })
    .filter((r) => r.increase > 0 && (r.percent === null || r.percent >= 10))
    .sort((a, b) => b.increase - a.increase);
}

function rising(ctx: Ctx): Answer {
  const [current, previous, before] = ctx.data.months;
  // Two finished months when there are; otherwise this month against the last one.
  const later = before ? previous : current;
  const earlier = before ?? previous;
  const near = (ctx.data.budget?.categories ?? []).filter((c) => c.tone !== 'ok');
  if (!later || !earlier) return noData(ctx, 'rising', current);
  const rows = risingCategories(later, earlier).slice(0, MAX_ROWS);
  const month = monthOf(later, ctx);
  const budgetLines = near.map((c) =>
    say('assistant.f.budgetNear', {
      category: categoryName(c.category),
      percent: String(c.percent),
      spent: formatMoney(c.spent, ctx.data.budget?.currency ?? ctx.currency, ctx.language),
      limit: formatMoney(c.limit, ctx.data.budget?.currency ?? ctx.currency, ctx.language),
    }),
  );
  return {
    intent: 'rising',
    facts: [
      rows.length
        ? `Categories that rose in ${monthEn(later)} vs ${monthEn(earlier)}: ` +
          rows.map((r) => `${r.category} ${later.currency} ${r.amount} (${r.percent === null ? 'new' : `+${r.percent}%`})`).join('; ')
        : `No category rose by 10% or more in ${monthEn(later)} vs ${monthEn(earlier)}.`,
      ...near.map((c) => `Budget this month: ${c.category} used ${c.percent}% (${c.spent} of ${c.limit}), status ${c.tone}.`),
    ],
    fallback: lines(
      rows.length ? say('assistant.f.rising', { month }) : say('assistant.f.risingNone', { month }),
      ...rows.map((r) =>
        say(r.percent === null ? 'assistant.f.risingNew' : 'assistant.f.risingRow', {
          category: categoryName(r.category),
          amount: formatMoney(r.amount, later.currency, ctx.language),
          percent: String(r.percent ?? 0),
        }),
      ),
      ...budgetLines,
    ),
    actions: near.length ? [{ id: 'edit_budget' }, { id: 'view_reports' }] : [{ id: 'view_reports' }],
  };
}

// ---------- budget and savings ----------

function budget(ctx: Ctx): Answer {
  const b = ctx.data.budget;
  if (!b) {
    return {
      intent: 'budget',
      facts: ['The user has no budget for this month.'],
      fallback: say('assistant.f.budgetNone'),
      actions: [{ id: 'view_budget' }],
    };
  }
  const money = (amount: string) => formatMoney(amount, b.currency, ctx.language);
  const over = b.categories.filter((c) => c.tone === 'over');
  const warn = b.categories.filter((c) => c.tone === 'warning');
  const list = (rows: typeof over) =>
    rows.map((c) => `${categoryName(c.category)} (${c.percent}%)`).join(ctx.language === 'ar' ? '، ' : ', ');
  return {
    intent: 'budget',
    facts: [
      `Budget this month: ${b.currency} ${b.spent} spent of ${b.limit} (${b.percent}%), ${b.remaining} left.`,
      ...b.categories.map((c) => `${c.category}: ${c.spent} of ${c.limit} (${c.percent}%, ${c.tone}).`),
    ],
    fallback: lines(
      say('assistant.f.budget', { spent: money(b.spent), limit: money(b.limit), percent: String(b.percent) }),
      over.length > 0 && say('assistant.f.budgetOver', { list: list(over) }),
      warn.length > 0 && say('assistant.f.budgetWarn', { list: list(warn) }),
    ),
    actions: [{ id: 'edit_budget' }],
  };
}

function savings(question: string, ctx: Ctx): Answer {
  const report = LAST_MONTH.test(question) ? ctx.data.months[1] : (ctx.data.months[1] ?? ctx.data.months[0]);
  if (!report) return noData(ctx, 'savings');
  const month = monthOf(report, ctx);
  const money = (amount: string) => formatMoney(amount, report.currency, ctx.language);
  if (report.savingsRate === null) {
    return {
      intent: 'savings',
      facts: [`No income recorded in ${monthEn(report)}; savings rate unknown. Spent ${report.currency} ${report.spent}.`],
      fallback: say('assistant.f.savingsNoIncome', { month }),
      actions: [{ id: 'view_reports' }],
    };
  }
  return {
    intent: 'savings',
    facts: [`${monthEn(report)}: income ${report.currency} ${report.income}, spent ${report.spent}, kept ${report.net} (savings rate ${report.savingsRate}%).`],
    fallback: say('assistant.f.savings', { month, net: money(report.net), income: money(report.income), rate: String(report.savingsRate) }),
    actions: [{ id: 'view_goals' }],
  };
}

// ---------- subscriptions and cuts ----------

function subscriptionsAnswer(ctx: Ctx): Answer {
  const subs = ctx.data.subscriptions.filter((s) => s.currency === ctx.currency);
  if (!subs.length) {
    return {
      intent: 'subscriptions',
      facts: ['No confirmed subscriptions.'],
      fallback: say('assistant.f.subsNone'),
      actions: [{ id: 'view_subscriptions' }],
    };
  }
  const sorted = [...subs].sort((a, b) => minor(b.monthlyCost, ctx) - minor(a.monthlyCost, ctx));
  const total = subs.reduce((sum, s) => sum + minor(s.monthlyCost, ctx), 0);
  return {
    intent: 'subscriptions',
    facts: [
      `Confirmed subscriptions: ${subs.length}, together ${plain(total, ctx)} a month.`,
      ...sorted.map((s) => `${s.name}: ${ctx.currency} ${s.monthlyCost} a month (${s.cycle.toLowerCase()}).`),
    ],
    fallback: say('assistant.f.subs', {
      total: shown(total, ctx),
      count: String(subs.length),
      list: sorted.slice(0, 3).map((s) => `${s.name} (${formatMoney(s.monthlyCost, ctx.currency, ctx.language)})`).join(', '),
    }),
    actions: [{ id: 'view_subscriptions' }],
  };
}

export type Cut = { kind: 'category' | 'subscription'; name: string; saving: number };

// Lifestyle spending of the last finished month, trimmed by a quarter, and each confirmed subscription.
// Biggest saving first. Amounts in minor units of the user's currency.
export function cutOptions(data: AssistantData): Cut[] {
  const report = fullMonth(data);
  const categories: Cut[] =
    report && report.currency === data.currency
      ? report.categories
          .filter((c) => lifestyleGroup(c.category) === 'lifestyle' && c.category !== 'Subscriptions')
          .map((c) => ({ kind: 'category' as const, name: c.category, saving: Math.round(toMinor(c.amount, data.currency) * CUT_SHARE) }))
      : [];
  const subs: Cut[] = data.subscriptions
    .filter((s) => s.currency === data.currency)
    .map((s) => ({ kind: 'subscription' as const, name: s.name, saving: toMinor(s.monthlyCost, data.currency) }));
  return [...categories, ...subs].filter((c) => c.saving > 0).sort((a, b) => b.saving - a.saving);
}

const cutFact = (c: Cut, ctx: Ctx) =>
  c.kind === 'category'
    ? `Spend 25% less on ${c.name}: saves ${plain(c.saving, ctx)} a month`
    : `Cancel the ${c.name} subscription: saves ${plain(c.saving, ctx)} a month`;
const cutLine = (c: Cut, ctx: Ctx) =>
  c.kind === 'category'
    ? say('assistant.f.cutCategory', { category: categoryName(c.name), amount: shown(c.saving, ctx) })
    : say('assistant.f.cutSub', { name: c.name, amount: shown(c.saving, ctx) });

function cut(ctx: Ctx): Answer {
  const options = cutOptions(ctx.data).slice(0, MAX_ROWS);
  const report = fullMonth(ctx.data);
  if (!options.length) {
    return { intent: 'cut', facts: ['No lifestyle spending or subscriptions to cut.'], fallback: say('assistant.f.cutNone'), actions: [{ id: 'view_reports' }] };
  }
  const total = options.reduce((sum, c) => sum + c.saving, 0);
  const lifestyle = report?.lifestyle.find((l) => l.group === 'lifestyle');
  return {
    intent: 'cut',
    facts: [
      report && lifestyle ? `Lifestyle (wants) spending in ${monthEn(report)}: ${report.currency} ${lifestyle.amount} (${lifestyle.percent}% of spending).` : '',
      ...options.map((c) => cutFact(c, ctx)),
      `All of these together: ${plain(total, ctx)} a month.`,
    ].filter(Boolean),
    fallback: lines(
      say('assistant.f.cut', { month: report ? monthOf(report, ctx) : '' }),
      ...options.map((c) => `• ${cutLine(c, ctx)}`),
      say('assistant.f.cutTotal', { amount: shown(total, ctx) }),
    ),
    actions: [{ id: 'edit_budget' }, { id: 'view_subscriptions' }],
  };
}

// ---------- goals ----------

const words = (s: string) => s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3);

// The goal whose name shares a word with the question.
export function namedGoal(question: string, goals: Goal[]): Goal | null {
  const asked = new Set(words(question));
  return goals.find((g) => words(g.name).some((w) => asked.has(w))) ?? null;
}

// The goal the question names, or the only active one.
export const findGoal = (question: string, goals: Goal[]): Goal | null =>
  namedGoal(question, goals) ?? (goals.length === 1 ? goals[0] : null);

export type GoalPlan = {
  remaining: number;
  daysLeft: number | null;
  perDay: number | null;
  perWeek: number | null;
  perMonth: number | null;
  free: number | null; // free cash flow a month
  availableByDate: number | null; // what the usual surplus adds up to by the target date
  realistic: boolean | null;
  gap: number; // short by this much at the usual pace (0 when realistic)
  monthsAtPace: number | null; // without a date: how long the usual surplus takes
  cuts: Cut[]; // the cuts that would close the gap
};

const ceilDiv = (a: number, b: number) => Math.ceil(a / b);

// All money in minor units of the goal's currency. today is a calendar day; the target date counts.
export function planGoal(goal: Goal, data: AssistantData): GoalPlan {
  const remaining = Math.max(toMinor(goal.targetAmount, goal.currency) - toMinor(goal.savedAmount, goal.currency), 0);
  const sameCurrency = goal.currency === data.currency;
  const free = sameCurrency ? freeCashFlow(data) : null;
  const start = Date.UTC(data.today.getFullYear(), data.today.getMonth(), data.today.getDate());
  const end = goal.targetDate ? Date.UTC(goal.targetDate.getFullYear(), goal.targetDate.getMonth(), goal.targetDate.getDate()) : null;
  const daysLeft = end === null ? null : Math.max(Math.round((end - start) / DAY_MS), 1);

  const plan: GoalPlan = {
    remaining,
    daysLeft,
    perDay: daysLeft ? ceilDiv(remaining, daysLeft) : null,
    perWeek: daysLeft ? (daysLeft <= 7 ? remaining : ceilDiv(remaining * 7, daysLeft)) : null,
    perMonth: daysLeft ? (daysLeft <= 30 ? remaining : ceilDiv(remaining * 30, daysLeft)) : null,
    free,
    availableByDate: null,
    realistic: null,
    gap: 0,
    monthsAtPace: null,
    cuts: [],
  };
  if (remaining === 0 || free === null) return plan;

  if (daysLeft === null) {
    plan.monthsAtPace = free > 0 ? ceilDiv(remaining, free) : null;
    return plan;
  }
  const available = Math.max(Math.floor((free * daysLeft) / 30), 0);
  plan.availableByDate = available;
  plan.realistic = available >= remaining;
  plan.gap = Math.max(remaining - available, 0);
  if (plan.gap > 0) {
    // Monthly savings needed to close the gap within the time left (at least one month's worth).
    const neededMonthly = ceilDiv(plan.gap * 30, Math.max(daysLeft, 30));
    let covered = 0;
    for (const option of cutOptions(data)) {
      if (covered >= neededMonthly) break;
      plan.cuts.push(option);
      covered += option.saving;
    }
  }
  return plan;
}

function goalAnswer(question: string, ctx: Ctx): Answer {
  const goals = ctx.data.goals;
  if (!goals.length) {
    return { intent: 'goal', facts: ['The user has no active goals.'], fallback: say('assistant.f.goalNone'), actions: [{ id: 'view_goals' }] };
  }
  const goal = findGoal(question, goals);
  if (!goal) {
    const list = goals.map((g) => g.name).join(', ');
    return {
      intent: 'goal',
      facts: [`Active goals: ${goals.map((g) => `${g.name} (${g.currency} ${g.savedAmount} of ${g.targetAmount})`).join('; ')}. The question did not name one.`],
      fallback: say('assistant.f.goalWhich', { list }),
      actions: [{ id: 'view_goals' }],
    };
  }

  const plan = planGoal(goal, ctx.data);
  const gm = (value: number) => shown(value, ctx, goal.currency);
  const gp = (value: number) => `${goal.currency} ${fromMinor(value, goal.currency)}`;
  const actions: AssistantAction[] = [{ id: 'add_to_goal', goalId: goal.id, goalName: goal.name }];
  const header = `Goal "${goal.name}": target ${goal.currency} ${goal.targetAmount}, saved ${goal.savedAmount}, remaining ${gp(plan.remaining)}` +
    (goal.targetDate ? `, target date ${goal.targetDate.toISOString().slice(0, 10)} (${plan.daysLeft} days left).` : ', no target date.');

  if (plan.remaining === 0) {
    return { intent: 'goal', facts: [header, 'The goal is fully saved.'], fallback: say('assistant.f.goalReached', { goal: goal.name }), actions: [{ id: 'view_goals' }] };
  }

  const facts = [header];
  const out: string[] = [];
  if (plan.daysLeft !== null && plan.perDay !== null && plan.perWeek !== null) {
    facts.push(`Needed: ${gp(plan.perDay)} a day, ${gp(plan.perWeek)} a week` + (plan.perMonth !== null ? `, ${gp(plan.perMonth)} a month.` : '.'));
    out.push(say('assistant.f.goalPlan', { goal: goal.name, remaining: gm(plan.remaining), days: String(plan.daysLeft), perDay: gm(plan.perDay), perWeek: gm(plan.perWeek) }));
  } else {
    out.push(say('assistant.f.goalNoDate', { goal: goal.name, remaining: gm(plan.remaining) }));
  }

  if (goal.currency !== ctx.currency) {
    facts.push(`The goal's currency (${goal.currency}) differs from the spending currency (${ctx.currency}); no comparison with cash flow.`);
    out.push(say('assistant.f.goalCurrency', { goalCurrency: goal.currency, currency: ctx.currency }));
  } else if (plan.free !== null) {
    facts.push(`Usual free cash flow (income minus spending, average of finished months): ${gp(plan.free)} a month.`);
    if (plan.free <= 0) {
      facts.push('There is no surplus at the current pace.');
      out.push(say('assistant.f.goalNoSurplus'));
    } else {
      out.push(say('assistant.f.goalFree', { free: gm(plan.free) }));
      if (plan.realistic === true) {
        facts.push(`By the target date the usual surplus adds up to about ${gp(plan.availableByDate ?? 0)}: realistic.`);
        out.push(say('assistant.f.goalRealistic'));
      } else if (plan.realistic === false) {
        facts.push(`By the target date the usual surplus adds up to about ${gp(plan.availableByDate ?? 0)}: short by ${gp(plan.gap)}, not realistic without changes.`);
        out.push(say('assistant.f.goalGap', { gap: gm(plan.gap) }));
      } else if (plan.monthsAtPace !== null) {
        facts.push(`At the usual pace it takes about ${plan.monthsAtPace} months.`);
        out.push(say('assistant.f.goalMonths', { months: String(plan.monthsAtPace) }));
      }
    }
  }
  if (plan.cuts.length) {
    facts.push('Cuts that would close the gap: ' + plan.cuts.map((c) => cutFact(c, ctx)).join('; ') + '.');
    out.push(...plan.cuts.map((c) => `• ${cutLine(c, ctx)}`));
    actions.push({ id: 'edit_budget' });
  }
  return { intent: 'goal', facts, fallback: out.join('\n'), actions };
}

// ---------- investing (general guidance only) ----------

function invest(ctx: Ctx): Answer {
  const free = freeCashFlow(ctx.data);
  const spent = averageSpent(ctx.data);
  const disclaimer = say('assistant.f.investDisclaimer');
  if (free === null || spent === null || free <= 0) {
    return {
      intent: 'invest',
      facts: [free === null ? 'No income or spending data yet.' : `Free cash flow is ${plain(free, ctx)} a month: no surplus to invest.`, 'Give general guidance only.'],
      fallback: lines(say('assistant.f.investNoSurplus'), disclaimer),
      actions: [{ id: 'view_budget' }],
    };
  }
  return {
    intent: 'invest',
    facts: [
      `Usual free cash flow: ${plain(free, ctx)} a month. Average monthly spending: ${plain(spent, ctx)}.`,
      `Emergency fund of 3 to 6 months of spending: ${plain(spent * 3, ctx)} to ${plain(spent * 6, ctx)}.`,
      'Give general guidance only: emergency fund first, then savings accounts or Sharia-compliant funds as categories of options. No specific products.',
    ],
    fallback: lines(
      say('assistant.f.investIntro', { free: shown(free, ctx) }),
      say('assistant.f.investEmergency', { low: shown(spent * 3, ctx), high: shown(spent * 6, ctx) }),
      say('assistant.f.investOptions'),
      disclaimer,
    ),
    actions: [{ id: 'view_goals' }],
  };
}

// ---------- overview ----------

function overview(ctx: Ctx): Answer {
  const report = ctx.data.months[0];
  if (!report) return noData(ctx, 'overview');
  const money = (amount: string) => formatMoney(amount, report.currency, ctx.language);
  const top = report.categories[0];
  const facts = [
    `${monthEn(report)} so far: spent ${report.currency} ${report.spent}, income ${report.income}, net ${report.net}.`,
    top ? `Biggest category: ${top.category} ${report.currency} ${top.amount} (${top.percent}%).` : '',
    ctx.data.budget ? `Budget used: ${ctx.data.budget.percent}%.` : '',
  ].filter(Boolean);
  return {
    intent: 'overview',
    facts,
    fallback: lines(
      say('assistant.f.overview', { month: monthOf(report, ctx), spent: money(report.spent), income: money(report.income), net: money(report.net) }),
      top && say('assistant.f.overviewTop', { category: categoryName(top.category), amount: money(top.amount) }),
    ),
    actions: [{ id: 'view_reports' }],
  };
}

function noData(ctx: Ctx, intent: Intent, report?: Report): Answer {
  const month = report ? monthOf(report, ctx) : '';
  return {
    intent,
    facts: ['The app has no spending data for this question yet.'],
    fallback: month ? say('assistant.f.noDataMonth', { month }) : say('assistant.f.noData'),
    actions: [{ id: 'view_transactions' }],
  };
}

// The facts for one question. Pure: everything it needs is in data.
export function answerQuestion(question: string, data: AssistantData, language: Language): Answer {
  const ctx: Ctx = { data, language, currency: data.currency };
  switch (detectIntent(question)) {
    case 'invest':
      return invest(ctx);
    case 'goal':
      return goalAnswer(question, ctx);
    case 'cut':
      return cut(ctx);
    case 'subscriptions':
      return subscriptionsAnswer(ctx);
    case 'budget':
      return budget(ctx);
    case 'topExpenses':
      return topExpenses(question, ctx);
    case 'rising':
      return rising(ctx);
    case 'compare':
      return compare(ctx);
    case 'savings':
      return savings(question, ctx);
    case 'spendOn':
      return spendOn(question, ctx);
    default:
      // A goal named without a goal word ("Can I make the Dubai trip?") still gets its plan.
      return namedGoal(question, data.goals) ? goalAnswer(question, ctx) : overview(ctx);
  }
}
