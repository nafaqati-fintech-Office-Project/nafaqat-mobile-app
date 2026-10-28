import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { StatCard } from './StatCard';
import type { DashboardData } from './types';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, spacing } from '@/theme';
import { formatMoney } from '@/utils/money';

export function StatGrid({ data }: { data: DashboardData }) {
  const { t, language } = useLanguage();
  const comingSoon = t('dashboard.comingSoon');
  const budget =
    data.budgetState === 'unavailable'
      ? comingSoon
      : data.budgetUsedPercent === null
        ? '-'
        : `${data.budgetUsedPercent}%`;
  const subscriptions =
    data.subscriptionsState === 'unavailable'
      ? comingSoon
      : `${data.activeSubscriptions} ${t('dashboard.active')}`;

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
        onPress={() => router.push('/budget')}
      />
      <StatCard
        icon="subscriptions"
        tint={colors.orange}
        tintSoft={colors.orangeSoft}
        label={t('dashboard.subscriptions')}
        value={subscriptions}
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
