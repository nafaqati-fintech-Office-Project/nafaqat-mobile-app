import { StyleSheet, View } from 'react-native';

import { dashboardPeriod, dayOfThisWeek, dayPeriod } from './drill';
import type { DashboardData } from './types';
import { WeeklyBars } from './WeeklyBars';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { DrillPressable } from '@/features/transactions/DrillPressable';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, lineHeights, radius, shadows, sizes, spacing } from '@/theme';
import { monthName } from '@/utils/intl';
import { formatMoney } from '@/utils/money';

const percent = (value: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(Math.abs(value));

export function SpendingCard({ data }: { data: DashboardData }) {
  const { t, language } = useLanguage();
  const month = monthName(data.period.month, data.period.year, language);
  // Spending going down is good (green); going up is bad (red).
  const down = data.changePercent <= 0;
  const tone = down ? colors.success : colors.danger;
  const change = `${percent(data.changePercent)}%`;
  const period = dashboardPeriod(data, t, language);
  const spending = t('dashboard.totalSpending');

  return (
    <View style={styles.card}>
      <DrillPressable
        link={{ type: 'expenses', from: period.from, to: period.to, title: `${spending} · ${period.title}` }}
        label={`${spending}, ${formatMoney(data.totalSpending, data.currency, language)}`}
        style={styles.head}>
      <AppText style={styles.label}>
        {`${t('dashboard.totalSpending')} (${
          data.months === 1
            ? `${month} ${data.period.year}`
            : t('dashboard.lastMonths').replace('{count}', String(data.months))
        })`}
      </AppText>
      <View style={styles.amountRow}>
        <AppText weight="bold" style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
          {formatMoney(data.totalSpending, data.currency, language)}
        </AppText>
        <View
          style={[styles.chip, { backgroundColor: down ? colors.successSoft : colors.dangerSoft }]}
          accessible
          accessibilityLabel={`${t(down ? 'dashboard.changeDown' : 'dashboard.changeUp')} ${change}`}>
          <Icon name={down ? 'arrowDown' : 'arrowUp'} color={tone} size={sizes.icon} />
          <AppText weight="semibold" style={[styles.chipText, { color: tone }]}>
            {change}
          </AppText>
        </View>
      </View>
      </DrillPressable>
      <WeeklyBars
        weekly={data.weekly}
        linkFor={(day) => {
          const date = dayPeriod(dayOfThisWeek(day), language);
          return { type: 'expenses', ...date, title: `${spending} · ${date.title}` };
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  head: { gap: spacing.md },
  label: { fontSize: fontSizes.sm, color: colors.textSecondary },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  amount: {
    flexShrink: 1,
    fontSize: fontSizes.xxl,
    lineHeight: lineHeights.xxl,
    color: colors.textPrimary,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  chipText: { fontSize: fontSizes.xs },
});
