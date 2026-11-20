import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { dashboardPeriod } from './drill';
import { InfoCard } from './InfoCard';
import type { DashboardData } from './types';
import { AnimatedMoney } from '@/components/AnimatedMoney';
import { AppText } from '@/components/AppText';
import { GrowBar } from '@/components/GrowBar';
import { DrillPressable } from '@/features/transactions/DrillPressable';
import type { TransactionLink } from '@/features/transactions/transactionLinks';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, spacing } from '@/theme';
import { formatMoney } from '@/utils/money';

const BAR_HEIGHT = 10;

function FlowBar({ label, amount, currency, text, share, color, link, delay }: { label: string; amount: string; currency: string; text: string; share: number; color: string; link: TransactionLink; delay: number }) {
  return (
    <DrillPressable link={link} style={styles.bar} label={`${label}, ${text}`}>
      <View style={styles.line}>
        <AppText style={styles.label}>{label}</AppText>
        <AnimatedMoney amount={amount} currency={currency} weight="semibold" style={styles.value} />
      </View>
      <View style={styles.track}>
        <GrowBar axis="width" to={share} delay={delay} style={[styles.fill, { backgroundColor: color }]} />
      </View>
    </DrillPressable>
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
  const period = dashboardPeriod(data, t, language);
  const link = (label: string, type?: TransactionLink['type']): TransactionLink => ({
    type,
    from: period.from,
    to: period.to,
    title: `${label} · ${period.title}`,
  });

  // "this month" in the sentences, or "in this period" when the card covers several months.
  const month = data.months === 1;
  const summary =
    savingsRate === null
      ? t(month ? 'dashboard.cashFlowNoIncome' : 'dashboard.cashFlowNoIncomePeriod')
      : positive
        ? t(month ? 'dashboard.cashFlowKept' : 'dashboard.cashFlowKeptPeriod').replace('{percent}', String(savingsRate))
        : t(month ? 'dashboard.cashFlowOver' : 'dashboard.cashFlowOverPeriod').replace(
            '{percent}',
            String(Math.abs(savingsRate)),
          );

  return (
    <InfoCard
      title={t('dashboard.cashFlow')}
      action={{ label: t('reports.title'), onPress: () => router.push('/reports') }}>
      <FlowBar
        label={t('dashboard.income')}
        amount={income}
        currency={data.currency}
        text={money(income)}
        delay={0}
        share={share(incomeValue)}
        color={colors.success}
        link={link(t('dashboard.income'), 'income')}
      />
      <FlowBar
        label={t('dashboard.expenses')}
        amount={expenses}
        currency={data.currency}
        text={money(expenses)}
        delay={120}
        share={share(expensesValue)}
        color={colors.danger}
        link={link(t('dashboard.expenses'), 'expenses')}
      />
      <DrillPressable link={link(t('dashboard.net'))} style={styles.netRow} label={`${t('dashboard.net')}, ${money(net)}`}>
        <AppText style={styles.label}>{t('dashboard.net')}</AppText>
        <AnimatedMoney
          amount={net}
          currency={data.currency}
          weight="bold"
          style={[styles.net, { color: positive ? colors.success : colors.danger }]}
        />
      </DrillPressable>
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
