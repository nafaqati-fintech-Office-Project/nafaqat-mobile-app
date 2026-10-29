import { getLanguage } from '@/i18n';

export type FontWeight = 'regular' | 'medium' | 'semibold' | 'bold';

const families = {
  en: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  ar: {
    regular: 'Cairo_400Regular',
    medium: 'Cairo_500Medium',
    semibold: 'Cairo_600SemiBold',
    bold: 'Cairo_700Bold',
  },
} as const;

export const fontFamily = (weight: FontWeight) => families[getLanguage()][weight];

export const fontSizes = {
  xxs: 10,
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 26,
  xxl: 36,
} as const;

export const lineHeights = {
  xxs: 12,
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 34,
  xxl: 44,
} as const;
