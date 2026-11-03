import type { TranslationKey } from '@/i18n';

export type PlanId = 'free' | 'premium';
export type Billing = 'monthly' | 'yearly';

export type PlanFeature =
  | 'transactions'
  | 'reports'
  | 'alerts'
  | 'subscriptions'
  | 'budgets'
  | 'goals'
  | 'pdfExport'
  | 'assistant'
  | 'family';

// true: included; false: not included; a number: included up to that many.
type Allowance = boolean | number;

type FeatureRow = { feature: PlanFeature; label: TranslationKey; free: Allowance; premium: Allowance };

// The comparison table, in display order. Prices and limits are placeholders until the product
// decides; change them here and the screen follows.
export const FEATURES: FeatureRow[] = [
  { feature: 'transactions', label: 'plans.feature.transactions', free: true, premium: true },
  { feature: 'reports', label: 'plans.feature.reports', free: true, premium: true },
  { feature: 'alerts', label: 'plans.feature.alerts', free: true, premium: true },
  { feature: 'subscriptions', label: 'plans.feature.subscriptions', free: true, premium: true },
  { feature: 'budgets', label: 'plans.feature.budgets', free: 3, premium: true },
  { feature: 'goals', label: 'plans.feature.goals', free: 2, premium: true },
  { feature: 'pdfExport', label: 'plans.feature.pdfExport', free: false, premium: true },
  { feature: 'assistant', label: 'plans.feature.assistant', free: false, premium: true },
  { feature: 'family', label: 'plans.feature.family', free: false, premium: true },
];

// Decimal strings, like every other amount in the app. A currency not listed here falls back to SAR.
const PRICES: Record<string, Record<Billing, string>> = {
  SAR: { monthly: '19', yearly: '190' },
  PKR: { monthly: '999', yearly: '9999' },
};
const DEFAULT_CURRENCY = 'SAR';

export function premiumPrice(currency: string | null): { currency: string } & Record<Billing, string> {
  const code = currency && PRICES[currency] ? currency : DEFAULT_CURRENCY;
  return { currency: code, ...PRICES[code] };
}

// Whole months the yearly price saves over twelve monthly payments (19 × 12 = 228 vs 190 → 2).
export function monthsFreeYearly(price: Record<Billing, string>): number {
  const monthly = Number(price.monthly);
  if (!(monthly > 0)) return 0;
  return Math.max(0, Math.floor((monthly * 12 - Number(price.yearly)) / monthly));
}

function allowance(plan: PlanId, feature: PlanFeature): Allowance {
  const row = FEATURES.find((item) => item.feature === feature);
  return row ? row[plan] : false;
}

// Whether the plan includes the feature at all (a limited one counts as included).
export const canUse = (plan: PlanId, feature: PlanFeature) => allowance(plan, feature) !== false;

// How many of a counted feature the plan allows; null means no limit.
export function limitOf(plan: PlanId, feature: PlanFeature): number | null {
  const value = allowance(plan, feature);
  if (typeof value === 'number') return value;
  return value ? null : 0;
}

// Whether one more can be added when the user already has `count`.
export function canAddMore(plan: PlanId, feature: PlanFeature, count: number): boolean {
  const limit = limitOf(plan, feature);
  return limit === null || count < limit;
}

export const isPlanFeature = (value: unknown): value is PlanFeature =>
  typeof value === 'string' && FEATURES.some((item) => item.feature === value);
