import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SegmentedTabs, type SegmentedOption } from '@/components/SegmentedTabs';
import { CategoryTrendRow } from '@/features/insights/CategoryTrendRow';
import { InsightStatCard } from '@/features/insights/InsightStatCard';
import { MerchantRow } from '@/features/insights/MerchantRow';
import { SpendingTrendCard } from '@/features/insights/SpendingTrendCard';
import type { Insights } from '@/features/insights/types';
import { useInsights } from '@/features/insights/useInsights';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, shadows, spacing } from '@/theme';
import { formatMoney } from '@/utils/money';

type Tab = 'overview' | 'trends' | 'merchants';

const TABS: SegmentedOption<Tab>[] = [
  { value: 'overview', label: 'insights.tab.overview' },
  { value: 'trends', label: 'insights.tab.trends' },
  { value: 'merchants', label: 'insights.tab.merchants' },
];

export default function InsightsRoute() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>('overview');
  const { data, status, refreshing, refresh, retry, reload } = useInsights();

  // Coming back to the tab picks up transactions synced meanwhile; the first focus is the initial load.
  const focused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focused.current) void reload();
      focused.current = true;
    }, [reload]),
  );

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <AppText weight="bold" style={styles.title}>
          {t('tabs.insights')}
        </AppText>
        <SegmentedTabs options={TABS} value={tab} onChange={setTab} />

        {status === 'loading' || (status === 'ready' && !data) ? (
          <ActivityIndicator color={colors.primary} style={styles.spinner} />
        ) : status === 'error' || !data ? (
          <View style={styles.error}>
            <AppText weight="medium" style={styles.errorText}>
              {t('insights.loadError')}
            </AppText>
            <PrimaryButton label={t('insights.retry')} onPress={retry} />
          </View>
        ) : (
          <TabContent tab={tab} data={data} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TabContent({ tab, data }: { tab: Tab; data: Insights }) {
  const { language, t } = useLanguage();

  if (tab === 'overview') {
    return (
      <>
        <View style={styles.stats}>
          <InsightStatCard
            icon="savings"
            tint={colors.success}
            tintSoft={colors.successSoft}
            label={t('insights.savings')}
            value={formatMoney(data.savings, data.currency, language)}
            changePercent={data.savingsChangePercent}
            goodWhen="up"
          />
          <InsightStatCard
            icon="budget"
            tint={colors.violet}
            tintSoft={colors.violetSoft}
            label={t('insights.avgDailySpend')}
            value={formatMoney(data.avgDailySpend, data.currency, language)}
            changePercent={data.avgDailyChangePercent}
            goodWhen="down"
          />
        </View>
        <SpendingTrendCard monthly={data.monthly} currency={data.currency} />
      </>
    );
  }

  if (tab === 'trends') {
    return (
      <View style={styles.card}>
        <AppText weight="bold" style={styles.section}>
          {t('insights.categoryTrends')}
        </AppText>
        {data.categoryTrends.length > 0 ? (
          data.categoryTrends.map((item) => (
            <CategoryTrendRow key={item.category} item={item} currency={data.currency} />
          ))
        ) : (
          <AppText style={styles.note}>{t('insights.noCategories')}</AppText>
        )}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <AppText weight="bold" style={styles.section}>
        {t('insights.topMerchants')}
      </AppText>
      {data.merchantsState === 'unavailable' ? (
        <AppText style={styles.note}>{t('insights.merchantsUnavailable')}</AppText>
      ) : data.merchants.length > 0 ? (
        data.merchants.map((item, i) => (
          <MerchantRow key={item.merchant} item={item} rank={i + 1} currency={data.currency} />
        ))
      ) : (
        <AppText style={styles.note}>{t('insights.noMerchants')}</AppText>
      )}
      {data.merchantsTruncated && <AppText style={styles.note}>{t('insights.merchantsPartial')}</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgLight },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontSize: fontSizes.xl, color: colors.textPrimary },
  spinner: { marginTop: spacing.xxxl },
  error: { gap: spacing.lg, paddingVertical: spacing.xxl },
  errorText: { fontSize: fontSizes.md, color: colors.textPrimary, textAlign: 'center' },
  stats: { flexDirection: 'row', gap: spacing.md },
  card: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.white, ...shadows.card },
  section: { fontSize: fontSizes.md, color: colors.textPrimary, marginBottom: spacing.xs },
  note: { fontSize: fontSizes.sm, color: colors.textSecondary, paddingVertical: spacing.sm },
});
