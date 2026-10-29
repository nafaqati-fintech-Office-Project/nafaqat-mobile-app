import { colors } from './colors';

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  phone: 32,
  pill: 999,
} as const;

export const sizes = {
  touchMin: 44,
  button: 56,
  logoSplash: 96,
  logoMini: 22,
  chipIcon: 28,
  icon: 16,
  iconLg: 22,
  dot: 8,
  dotActive: 24,
  notchWidth: 56,
  skeletonLine: 10,
  flag: 44,
  checkCircle: 26,
  input: 52,
  checkbox: 22,
  logoLogin: 56,
  logoHeader: 32,
  avatar: 48,
  bell: 44,
  bellDot: 9,
  bellBadge: 18,
  iconTile: 40,
  chartHeight: 110,
  tabIcon: 24,
} as const;

export const shadows = {
  card: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  button: {
    shadowColor: colors.shadowPrimary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  tabBar: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 8,
  },
  logo: {
    shadowColor: colors.logoEnd,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;
