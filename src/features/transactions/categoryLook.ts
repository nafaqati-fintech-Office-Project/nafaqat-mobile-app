import type { IconName } from '@/components/Icon';
import { colors } from '@/theme';

export type CategoryLook = { icon: IconName; tint: string; tintSoft: string };

// Icon and colours per category (the app's names, see categoryDisplay); anything else gets FALLBACK.
const LOOKS: Record<string, CategoryLook> = {
  'Food & Beverage': { icon: 'cup', tint: colors.success, tintSoft: colors.successSoft },
  'Clothing & Shopping': { icon: 'bag', tint: colors.orange, tintSoft: colors.orangeSoft },
  Groceries: { icon: 'bag', tint: colors.success, tintSoft: colors.successSoft },
  Salary: { icon: 'savings', tint: colors.success, tintSoft: colors.successSoft },
  Housing: { icon: 'home', tint: colors.violet, tintSoft: colors.violetSoft },
  Subscriptions: { icon: 'subscriptions', tint: colors.primary, tintSoft: colors.primarySoft },
  Transportation: { icon: 'car', tint: colors.primary, tintSoft: colors.primarySoft },
  Fuel: { icon: 'car', tint: colors.danger, tintSoft: colors.dangerSoft },
  Entertainment: { icon: 'star', tint: colors.danger, tintSoft: colors.dangerSoft },
  Utilities: { icon: 'bolt', tint: colors.violet, tintSoft: colors.violetSoft },
};
const FALLBACK: CategoryLook = { icon: 'transactions', tint: colors.textSecondary, tintSoft: colors.border };

export const categoryLook = (category: string): CategoryLook => LOOKS[category] ?? FALLBACK;
