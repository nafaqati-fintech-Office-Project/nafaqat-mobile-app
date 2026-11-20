import { StyleSheet } from 'react-native';

import { colors, fontSizes, lineHeights, radius, sizes, spacing } from '@/theme';

export const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  iconWrap: {
    width: sizes.logoSplash,
    height: sizes.logoSplash,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.xl,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  text: {
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  notice: { fontSize: fontSizes.sm, color: colors.danger, textAlign: 'center' },
  steps: { fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: fontSizes.sm * 1.5 },
  footer: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, gap: spacing.md },
});
