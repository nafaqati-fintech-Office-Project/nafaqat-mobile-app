import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { InfoCard } from './InfoCard';
import type { DashboardData } from './types';
import { AppText } from '@/components/AppText';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, spacing } from '@/theme';
import { formatMoney } from '@/utils/money';

const BAR_HEIGHT = 10;

function FlowBar({ label, value, share, color }: { label: string; value: string; share: number; color: string }) {
  return (
    <View style={styles.bar} accessible accessibilityLabel={`${label}, ${value}`}>
      <View style={styles.line}>
        <AppText style={styles.label}>{label}</AppText>
        <AppText weight="semibold" style={styles.value}>
          {value}
        </AppText>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${share}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export function CashFlowCard({ data }: { data: DashboardData }) {
  const { t, language } = useLanguage();
  const { income, expenses, net, savingsRate } = data.cashFlow;
  const money = (value: string) => formatMoney(value, data.currency, language);

  // Bar lengths are a scale only: the larger of income and expenses fills the track.
  const incomeValue = Number(income);
  const expensesValue = Number(expenses);
  const peak = Math.max(incomeValue, expensesValue);
  const share = (value: number) => (peak > 0 ? Math.max(Math.round((value / peak) * 100), value > 0 ? 3 : 0) : 0);
  const positive = Number(net) >= 0;

  const summary =
    savingsRate === null
      ? t('dashboard.cashFlowNoIncome')
      : positive
        ? t('dashboard.cashFlowKept').replace('{percent}', String(savingsRate))
        : t('dashboard.cashFlowOver').replace('{percent}', String(Math.abs(savingsRate)));

  return (
    <InfoCard
      title={t('dashboard.cashFlow')}
      action={{ label: t('reports.title'), onPress: () => router.push('/reports') }}>
      <FlowBar label={t('dashboard.income')} value={money(income)} share={share(incomeValue)} color={colors.success} />
      <FlowBar
        label={t('dashboard.expenses')}
        value={money(expenses)}
        share={share(expensesValue)}
        color={colors.danger}
      />
      <View style={styles.netRow}>
        <AppText style={styles.label}>{t('dashboard.net')}</AppText>
        <AppText weight="bold" style={[styles.net, { color: positive ? colors.success : colors.danger }]}>
          {money(net)}
        </AppText>
      </View>
      <AppText style={styles.summary}>{summary}</AppText>
    </InfoCard>
  );
}

const styles = StyleSheet.create({
  bar: { gap: spacing.xs },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  label: { fontSize: fontSizes.sm, color: colors.textSecondary },
  value: { fontSize: fontSizes.sm, color: colors.textPrimary },
  track: { height: BAR_HEIGHT, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  net: { fontSize: fontSizes.lg },
  summary: { fontSize: fontSizes.xs, color: colors.textSecondary },
});
