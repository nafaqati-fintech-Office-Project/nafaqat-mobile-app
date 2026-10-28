import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { TrendChart } from './TrendChart';
import type { MonthAmount } from './types';
import { AppText } from '@/components/AppText';
import { SegmentedTabs, type SegmentedOption } from '@/components/SegmentedTabs';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, shadows, spacing } from '@/theme';

type Range = '3' | '6' | '12';

const RANGES: SegmentedOption<Range>[] = [
  { value: '3', label: 'insights.range.3' },
  { value: '6', label: 'insights.range.6' },
  { value: '12', label: 'insights.range.12' },
];

export function SpendingTrendCard({ monthly, currency }: { monthly: MonthAmount[]; currency: string }) {
  const { t } = useLanguage();
  const [range, setRange] = useState<Range>('6');
  const months = monthly.slice(-Number(range));

  return (
    <View style={styles.card}>
      <AppText weight="bold" style={styles.title}>
        {t('insights.spendingTrend')}
      </AppText>
      <SegmentedTabs options={RANGES} value={range} onChange={setRange} />
      {/* A new range starts again on its latest month. */}
      <TrendChart key={range} months={months} currency={currency} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.white, ...shadows.card },
  title: { fontSize: fontSizes.md, color: colors.textPrimary },
});
