import { StyleSheet, View } from 'react-native';

import { barHeight } from './barHeight';
import { monthPeriod } from './drill';
import { InfoCard } from './InfoCard';
import type { DashboardData } from './types';
import { AnimatedMoney } from '@/components/AnimatedMoney';
import { AppText } from '@/components/AppText';
import { GrowBar } from '@/components/GrowBar';
import { DrillPressable } from '@/features/transactions/DrillPressable';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';
import { monthName } from '@/utils/intl';
import { formatMoney } from '@/utils/money';

export function SavingsTrendCard({ data }: { data: DashboardData }) {
  const { t, language } = useLanguage();
  const values = data.savingsTrend.map((m) => Number(m.net)); // chart scale only, not money math
  const peak = Math.max(0, ...values.map(Math.abs));
  const best = peak > 0 ? values.indexOf(Math.max(...values)) : -1;
  const current = data.savingsTrend[data.savingsTrend.length - 1];

  return (
    <InfoCard
      title={t('dashboard.savingsTrend')}
      note={data.savingsTrendState === 'unavailable' ? t('dashboard.sectionUnavailable') : null}>
      <View style={styles.row}>
        {data.savingsTrend.map((m, i) => {
          const negative = values[i] < 0;
          const month = monthPeriod(m.year, m.month, language);
          return (
            <DrillPressable
              key={`${m.year}-${m.month}`}
              link={{ from: month.from, to: month.to, title: `${t('dashboard.savingsTrend')} · ${month.title}` }}
              style={styles.col}
              label={`${monthName(m.month, m.year, language)}, ${formatMoney(m.net, data.currency, language)}`}>
              <View style={styles.track}>
                <GrowBar
                  axis="height"
                  to={barHeight(Math.abs(values[i]), peak)}
                  delay={i * 60}
                  style={[
                    styles.bar,
                    values[i] === 0 && styles.barEmpty,
                    negative && styles.barNegative,
                    i === best && !negative && styles.barBest,
                  ]}
                />
              </View>
              <AppText style={styles.month}>{monthName(m.month, m.year, language).slice(0, 3)}</AppText>
            </DrillPressable>
          );
        })}
      </View>
      {current && (
        <View style={styles.hintRow}>
          <AppText style={styles.hint}>{`${t('dashboard.thisMonth')}: `}</AppText>
          <AnimatedMoney amount={current.net} currency={data.currency} style={styles.hint} />
        </View>
      )}
    </InfoCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  col: { flex: 1, alignItems: 'center', gap: spacing.sm },
  track: { height: sizes.chartHeight, justifyContent: 'flex-end', alignSelf: 'stretch', alignItems: 'center' },
  bar: { width: '60%', borderRadius: radius.sm, backgroundColor: colors.primaryDisabled },
  barEmpty: { backgroundColor: colors.border },
  barNegative: { backgroundColor: colors.danger },
  barBest: { backgroundColor: colors.violet },
  month: { fontSize: fontSizes.xs, color: colors.textSecondary },
  hint: { fontSize: fontSizes.xs, color: colors.textSecondary },
  hintRow: { flexDirection: 'row', alignItems: 'center' },
});
