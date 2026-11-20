import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { ReduceMotion, ZoomIn } from 'react-native-reanimated';

import { dayPeriod } from './drill';
import { InfoCard } from './InfoCard';
import type { DashboardData, HeatLevel } from './types';
import { AppText } from '@/components/AppText';
import { openTransactions } from '@/features/transactions/transactionLinks';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, spacing } from '@/theme';
import { monthName, weekdayShort } from '@/utils/intl';
import { formatMoney } from '@/utils/money';

const LEVEL_COLORS: Record<HeatLevel, string> = {
  0: colors.bgLightAccent,
  1: colors.primarySoft,
  2: colors.primaryDisabled,
  3: colors.primary,
  4: colors.indigo800,
};
const WEEK = [0, 1, 2, 3, 4, 5, 6];
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function HeatmapCard({ data }: { data: DashboardData }) {
  const { t, language } = useLanguage();
  const [picked, setPicked] = useState<number | null>(null);
  const month = monthName(data.period.month, data.period.year, language);
  const { offset, days } = data.heatmap;
  const hasSpending = days.some((d) => d.level > 0);
  const pickedDay = days.find((d) => d.day === picked);

  const cells: (typeof days[number] | null)[] = [...Array<null>(offset).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  return (
    <InfoCard
      title={`${t('dashboard.heatmap')} (${month})`}
      note={data.heatmapState === 'unavailable' ? t('dashboard.sectionUnavailable') : null}>
      <View style={styles.row}>
        {WEEK.map((d) => (
          <AppText key={d} style={styles.weekday}>
            {weekdayShort(d, language).slice(0, 2)}
          </AppText>
        ))}
      </View>
      {weeks.map((week, w) => (
        <View key={w} style={styles.row}>
          {week.map((cell, i) =>
            cell ? (
              <AnimatedPressable
                key={cell.day}
                entering={ZoomIn.delay(cell.day * 18).duration(260).reduceMotion(ReduceMotion.System)}
                onPress={() => setPicked(cell.day === picked ? null : cell.day)}
                style={[
                  styles.cell,
                  { backgroundColor: LEVEL_COLORS[cell.level] },
                  cell.day === picked && styles.cellPicked,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${cell.day} ${month}, ${formatMoney(cell.amount, data.currency, language)}`}>
                <AppText style={[styles.day, cell.level >= 3 && styles.dayOnDark]}>{cell.day}</AppText>
              </AnimatedPressable>
            ) : (
              <View key={`empty-${i}`} style={styles.cell} />
            ),
          )}
        </View>
      ))}
      <View style={styles.footer}>
        {pickedDay && (
          <Pressable
            onPress={() => {
              const day = dayPeriod(new Date(data.period.year, data.period.month - 1, pickedDay.day), language);
              openTransactions({ type: 'expenses', ...day, title: `${t('dashboard.expenses')} · ${day.title}` });
            }}
            accessibilityRole="link"
            hitSlop={spacing.sm}>
            <AppText weight="semibold" style={styles.link}>
              {t('transactions.viewDay', { day: `${pickedDay.day} ${month}` })}
            </AppText>
          </Pressable>
        )}
        <AppText style={styles.picked}>
          {pickedDay
            ? `${pickedDay.day} ${month}: ${formatMoney(pickedDay.amount, data.currency, language)}`
            : hasSpending
              ? t('dashboard.heatmapHint')
              : t('dashboard.noSpendingMonth')}
        </AppText>
        <View style={styles.legend}>
          <AppText style={styles.picked}>{t('dashboard.less')}</AppText>
          {([0, 1, 2, 3, 4] as HeatLevel[]).map((level) => (
            <View key={level} style={[styles.swatch, { backgroundColor: LEVEL_COLORS[level] }]} />
          ))}
          <AppText style={styles.picked}>{t('dashboard.more')}</AppText>
        </View>
      </View>
    </InfoCard>
  );
}

const GAP = spacing.xs;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: GAP },
  weekday: { flex: 1, textAlign: 'center', fontSize: fontSizes.xs, color: colors.textSecondary },
  cell: { flex: 1, aspectRatio: 1, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  cellPicked: { borderWidth: 2, borderColor: colors.violet },
  day: { fontSize: fontSizes.xs, color: colors.textSecondary },
  dayOnDark: { color: colors.white },
  footer: { gap: spacing.sm },
  picked: { fontSize: fontSizes.xs, color: colors.textSecondary },
  link: { fontSize: fontSizes.sm, color: colors.primary },
  legend: { flexDirection: 'row', alignItems: 'center', gap: GAP, alignSelf: 'flex-end' },
  swatch: { width: 14, height: 14, borderRadius: 4 },
});
