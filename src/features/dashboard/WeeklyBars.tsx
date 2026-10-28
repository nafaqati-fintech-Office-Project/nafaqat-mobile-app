import { StyleSheet, View } from 'react-native';

import { barHeight } from './barHeight';
import type { WeeklyAmount } from './types';
import { AppText } from '@/components/AppText';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';
import { weekdayShort } from '@/utils/intl';

export function WeeklyBars({ weekly }: { weekly: WeeklyAmount[] }) {
  const { t, language } = useLanguage();
  const values = weekly.map((w) => Number(w.amount)); // chart scale only, not money math
  const highest = Math.max(...values);
  const peak = highest > 0 ? highest : 1;
  const tallest = highest > 0 ? values.indexOf(highest) : -1;

  return (
    <View style={styles.chart}>
      <View style={styles.row}>
        {weekly.map((w, i) => (
          <View key={w.day} style={styles.col}>
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
          </View>
        ))}
      </View>
      {highest <= 0 && <AppText style={styles.empty}>{t('dashboard.noSpendingWeek')}</AppText>}
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
