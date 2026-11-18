import { StyleSheet, View } from 'react-native';

import { barHeight } from './barHeight';
import type { WeeklyAmount } from './types';
import { AppText } from '@/components/AppText';
import { DrillPressable } from '@/features/transactions/DrillPressable';
import type { TransactionLink } from '@/features/transactions/transactionLinks';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';
import { weekdayShort } from '@/utils/intl';

// One bar per day of the week; linkFor (optional) makes a bar open that day's transactions.
export function WeeklyBars({ weekly, linkFor }: { weekly: WeeklyAmount[]; linkFor?: (day: number) => TransactionLink }) {
  const { t, language } = useLanguage();
  const values = weekly.map((w) => Number(w.amount)); // chart scale only, not money math
  const highest = Math.max(...values);
  const peak = highest > 0 ? highest : 1;
  const tallest = highest > 0 ? values.indexOf(highest) : -1;

  return (
    <View style={styles.chart}>
      <View style={styles.row}>
        {weekly.map((w, i) => (
          <DrillPressable key={w.day} link={linkFor ? linkFor(w.day) : null} style={styles.col} label={weekdayShort(w.day, language)}>
            <View style={styles.track}>
              <View
                style={[
                  styles.bar,
                  { height: barHeight(values[i], peak) },
                  values[i] <= 0 && styles.barEmpty,
                  i === tallest && styles.barTop,
                ]}
              />
            </View>
            <AppText style={styles.day}>{weekdayShort(w.day, language)}</AppText>
          </DrillPressable>
        ))}
      </View>
      {highest <= 0 && <AppText style={styles.empty}>{t('dashboard.noSpendingPeriod')}</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  col: { flex: 1, alignItems: 'center', gap: spacing.sm },
  track: {
    height: sizes.chartHeight,
    justifyContent: 'flex-end',
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  bar: { width: '60%', borderRadius: radius.sm, backgroundColor: colors.primaryDisabled },
  barEmpty: { backgroundColor: colors.border },
  barTop: { backgroundColor: colors.violet },
  day: { fontSize: fontSizes.xs, color: colors.textSecondary },
  empty: { fontSize: fontSizes.xs, color: colors.textSecondary, textAlign: 'center' },
});
