import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, shadows, sizes, spacing } from '@/theme';
import { FEATURES, limitOf, type PlanFeature, type PlanId } from './plans';

type Props = { highlight?: PlanFeature | null };

// Feature rows with a Free and a Premium column. The feature the user tapped to get here is tinted.
export function PlanComparison({ highlight }: Props) {
  const { t } = useLanguage();

  // What a limited row says: "Last 90 days", "50 messages", or just "Up to 3".
  const limitText = (unit: 'days' | 'messages' | undefined, limit: number) =>
    unit === 'days'
      ? t('plans.upToDays', { count: String(limit) })
      : unit === 'messages'
        ? t('plans.upToMessages', { count: String(limit) })
        : t('plans.upTo', { count: String(limit) });

  const cell = (plan: PlanId, row: (typeof FEATURES)[number]) => {
    const limit = limitOf(plan, row.feature);
    if (limit === null) {
      // A row that counts something shows "Unlimited" on the plan with no limit; the others a tick.
      return row.unit ? (
        <AppText weight="medium" style={styles.limit}>
          {t('plans.unlimited')}
        </AppText>
      ) : (
        <Icon name="check" color={colors.success} size={sizes.icon} />
      );
    }
    if (limit > 0) {
      return (
        <AppText weight="medium" style={styles.limit}>
          {limitText(row.unit, limit)}
        </AppText>
      );
    }
    return <Icon name="close" color={colors.dotInactive} size={sizes.icon} />;
  };

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <AppText weight="bold" style={[styles.label, styles.head]}>
          {t('plans.features')}
        </AppText>
        <AppText weight="bold" style={[styles.column, styles.head]}>
          {t('plans.free')}
        </AppText>
        <AppText weight="bold" style={[styles.column, styles.head, styles.premiumHead]}>
          {t('plans.premium')}
        </AppText>
      </View>
      {FEATURES.map((row) => {
        const label = t(row.label);
        const included = (plan: PlanId) => {
          const limit = limitOf(plan, row.feature);
          if (limit === null) return t('plans.included');
          return limit > 0 ? limitText(row.unit, limit) : t('plans.notIncluded');
        };
        return (
          <View
            key={row.feature}
            accessible
            accessibilityLabel={`${label}. ${t('plans.free')}: ${included('free')}. ${t('plans.premium')}: ${included('premium')}`}
            style={[styles.row, styles.divider, row.feature === highlight && styles.highlight]}>
            <AppText style={styles.label}>{label}</AppText>
            <View style={styles.column}>{cell('free', row)}</View>
            <View style={styles.column}>{cell('premium', row)}</View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: sizes.touchMin },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  highlight: { marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg, backgroundColor: colors.primarySoft },
  label: { flex: 1, fontSize: fontSizes.sm, color: colors.textPrimary, paddingVertical: spacing.sm },
  head: { fontSize: fontSizes.xs, color: colors.textSecondary },
  premiumHead: { color: colors.violet },
  column: { width: 76, alignItems: 'center', textAlign: 'center' },
  limit: { fontSize: fontSizes.xs, color: colors.textPrimary, textAlign: 'center' },
});
