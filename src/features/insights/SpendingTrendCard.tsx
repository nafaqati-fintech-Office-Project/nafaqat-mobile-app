import { StyleSheet, View } from 'react-native';

import { TrendChart } from './TrendChart';
import type { MonthAmount } from './types';
import { AppText } from '@/components/AppText';
import { monthPeriod } from '@/features/dashboard/drill';
import { openTransactions } from '@/features/transactions/transactionLinks';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, shadows, spacing } from '@/theme';

// A single month still shows the last six, so there is a trend to read.
const MIN_MONTHS = 6;

export function SpendingTrendCard({ monthly, currency, period }: { monthly: MonthAmount[]; currency: string; period: number }) {
  const { t, language } = useLanguage();
  const months = monthly.slice(-Math.max(period, MIN_MONTHS));

  return (
    <View style={styles.card}>
      <AppText weight="bold" style={styles.title}>
        {t('insights.spendingTrend')}
      </AppText>
      {/* A new period starts again on its latest month. */}
      <TrendChart
        key={months.length}
        months={months}
        currency={currency}
        onOpenMonth={(m) => {
          const month = monthPeriod(m.year, m.month, language);
          openTransactions({ type: 'expenses', from: month.from, to: month.to, title: `${t('insights.spendingTrend')} · ${month.title}` });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.white, ...shadows.card },
  title: { fontSize: fontSizes.md, color: colors.textPrimary },
});
