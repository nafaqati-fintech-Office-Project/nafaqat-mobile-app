import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { StatCard } from './StatCard';
import type { DashboardData } from './types';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, spacing } from '@/theme';
import { formatMoney } from '@/utils/money';

export function StatGrid({ data }: { data: DashboardData }) {
  const { t, language } = useLanguage();
  const budget = data.budgetUsedPercent === null ? '-' : `${data.budgetUsedPercent}%`;

  return (
    <View style={styles.grid}>
      <StatCard
        icon="transactions"
        tint={colors.primary}
        tintSoft={colors.primarySoft}
        label={t('dashboard.transactions')}
        value={String(data.transactionCount)}
        onPress={() => router.navigate('/transactions')}
      />
      <StatCard
        icon="budget"
        tint={colors.violet}
        tintSoft={colors.violetSoft}
        label={t('dashboard.budget')}
        value={budget}
      />
      <StatCard
        icon="subscriptions"
        tint={colors.orange}
        tintSoft={colors.orangeSoft}
        label={t('dashboard.subscriptions')}
        value={`${data.activeSubscriptions} ${t('dashboard.active')}`}
      />
      <StatCard
        icon="savings"
        tint={colors.success}
        tintSoft={colors.successSoft}
        label={t('dashboard.savings')}
        value={formatMoney(data.savings, data.currency, language)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
});
