import type { TranslationKey } from '@/i18n';

export type PlanId = 'free' | 'premium';
export type Billing = 'monthly' | 'yearly';

export type PlanFeature =
  | 'transactions'
  | 'history'
  | 'budgets'
  | 'goals'
  | 'reports'
  | 'advancedReports'
  | 'smsImport'
  | 'receiptOcr'
  | 'cardFilter'
  | 'pdfExport'
  | 'assistant'
  | 'family';

// true: included; false: not included; a number: included up to that many (days or messages, see unit).
type Allowance = boolean | number;

type FeatureRow = {
  feature: PlanFeature;
  label: TranslationKey;
  free: Allowance;
  premium: Allowance;
  // The server's entitlement key, when the server decides this feature (billing-service).
  key?: string;
  // What a number counts; a limited row shows e.g. "Last 90 days" and Premium shows "Unlimited".
  unit?: 'days' | 'messages';
};

// The comparison table, in display order. It mirrors the plan data on the server (billing-service), which is the source of
// truth: signed in, the phone asks the server what the user may do, and this table is only what the plans screen shows.
export const FEATURES: FeatureRow[] = [
  { feature: 'transactions', label: 'plans.feature.transactions', free: true, premium: true },
  { feature: 'history', label: 'plans.feature.history', free: 90, premium: true, key: 'history.days', unit: 'days' },
  { feature: 'budgets', label: 'plans.feature.budgets', free: true, premium: true },
  { feature: 'goals', label: 'plans.feature.goals', free: true, premium: true },
  { feature: 'reports', label: 'plans.feature.reports', free: true, premium: true },
  { feature: 'advancedReports', label: 'plans.feature.advancedReports', free: false, premium: true, key: 'reports.advanced' },
  { feature: 'smsImport', label: 'plans.feature.smsImport', free: 50, premium: true, key: 'sms.initial_import.limit', unit: 'messages' },
  { feature: 'receiptOcr', label: 'plans.feature.receiptOcr', free: false, premium: true, key: 'receipt.ocr' },
  { feature: 'cardFilter', label: 'plans.feature.cardFilter', free: false, premium: true, key: 'transactions.card_filter' },
  { feature: 'pdfExport', label: 'plans.feature.pdfExport', free: false, premium: true, key: 'reports.export' },
  { feature: 'assistant', label: 'plans.feature.assistant', free: true, premium: true },
  { feature: 'family', label: 'plans.feature.family', free: false, premium: true, key: 'family.module' },
];

// Decimal strings, like every other amount in the app. Only used in demo mode and as a fallback: signed in, the prices come
// from the server. A currency not listed here falls back to SAR.
const PRICES: Record<string, Record<Billing, string>> = {
  SAR: { monthly: '19', yearly: '190' },
  PKR: { monthly: '499', yearly: '4990' },
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

// The server's entitlement key for a feature, or null when the server does not decide it.
export const entitlementKey = (feature: PlanFeature): string | null =>
  FEATURES.find((item) => item.feature === feature)?.key ?? null;
