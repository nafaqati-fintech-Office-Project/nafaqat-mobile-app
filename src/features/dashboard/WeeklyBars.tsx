import { StyleSheet, View } from 'react-native';

import type { WeeklyAmount } from './types';
import { AppText } from '@/components/AppText';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';
import { weekdayShort } from '@/utils/intl';

const MIN_BAR = spacing.xs;

export function WeeklyBars({ weekly }: { weekly: WeeklyAmount[] }) {
  const { language } = useLanguage();
  const values = weekly.map((w) => Number(w.amount)); // chart scale only, not money math
  const peak = Math.max(...values, 1);
  const tallest = values.indexOf(Math.max(...values));

  return (
    <View style={styles.row}>
      {weekly.map((w, i) => (
        <View key={w.day} style={styles.col}>
          <View style={styles.track}>
            <View
              style={[
                styles.bar,
                { height: Math.max((values[i] / peak) * sizes.chartHeight, MIN_BAR) },
                i === tallest && styles.barTop,
              ]}
            />
          </View>
          <AppText style={styles.day}>{weekdayShort(w.day, language)}</AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  col: { flex: 1, alignItems: 'center', gap: spacing.sm },
  track: {
    height: sizes.chartHeight,
    justifyContent: 'flex-end',
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  bar: { width: '60%', borderRadius: radius.sm, backgroundColor: colors.primaryDisabled },
  barTop: { backgroundColor: colors.violet },
  day: { fontSize: fontSizes.xs, color: colors.textSecondary },
});
