import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { PeriodTabs } from '@/components/PeriodTabs';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SegmentedTabs, type SegmentedOption } from '@/components/SegmentedTabs';
import { showUpgradePrompt } from '@/components/UpgradePrompt';
import { CategoryTrendRow } from '@/features/insights/CategoryTrendRow';
import { InsightStatCard } from '@/features/insights/InsightStatCard';
import type { Period } from '@/features/insights/insightsBuilder';
import { MerchantRow } from '@/features/insights/MerchantRow';
import { SpendingTrendCard } from '@/features/insights/SpendingTrendCard';
import type { Insights } from '@/features/insights/types';
import { useInsights } from '@/features/insights/useInsights';
import { usePlan } from '@/features/plans/usePlan';
import { categoryLabelKey } from '@/features/transactions/categoryDisplay';
import { canOpenCategory, monthsRange, type TransactionLink } from '@/features/transactions/transactionLinks';
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
  const [period, setPeriod] = useState<Period>(1);
  // Free: this month and 3 months, with a 3-month trend. Premium: 6 and 12 months and the 12-month trend.
  const { plan, can } = usePlan();
  const extended = can('advancedReports') === true;
  const { data, status, failure, refreshing, refresh, retry, reload } = useInsights(period, extended, plan !== null);

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
        <PeriodTabs
          value={period}
          onChange={setPeriod}
          limited={plan !== null && !extended}
          onLocked={() => showUpgradePrompt('advancedReports', 'plans.insightsLocked')}
        />

        {plan === null || status === 'loading' || (status === 'ready' && !data) ? (
          <ActivityIndicator color={colors.primary} style={styles.spinner} />
        ) : status === 'error' || !data ? (
          <View style={styles.error}>
            <AppText weight="medium" style={styles.errorText}>
              {t('insights.loadError')}
            </AppText>
            {__DEV__ && failure ? <AppText style={styles.debug}>{failure}</AppText> : null}
            <PrimaryButton label={t('insights.retry')} onPress={retry} />
          </View>
        ) : (
          <TabContent tab={tab} data={data} period={period} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TabContent({ tab, data, period }: { tab: Tab; data: Insights; period: number }) {
  const { language, t } = useLanguage();
  // The selected period: `period` months ending with the latest month of the trend (this month).
  const now = new Date();
  const last = data.monthly[data.monthly.length - 1] ?? { year: now.getFullYear(), month: now.getMonth() + 1 };
  const range = monthsRange(last.year, last.month, period);
  const periodTitle = period === 1 ? t('dashboard.thisMonth') : t('dashboard.lastMonths').replace('{count}', String(period));
  const link = (label: string, extra: Partial<TransactionLink> = {}): TransactionLink => ({
    ...range,
    ...extra,
    title: `${label} · ${periodTitle}`,
  });
  const categoryName = (category: string) => {
    const key = categoryLabelKey(category);
    return key ? t(key) : category;
  };

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
            link={link(t('insights.savings'))}
          />
          <InsightStatCard
            icon="budget"
            tint={colors.violet}
            tintSoft={colors.violetSoft}
            label={t('insights.avgDailySpend')}
            value={formatMoney(data.avgDailySpend, data.currency, language)}
            changePercent={data.avgDailyChangePercent}
            goodWhen="down"
            link={link(t('insights.avgDailySpend'), { type: 'expenses' })}
          />
        </View>
        <SpendingTrendCard monthly={data.monthly} currency={data.currency} period={period} />
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
            <CategoryTrendRow
              key={item.category}
              item={item}
              currency={data.currency}
              link={canOpenCategory(item.category) ? link(categoryName(item.category), { type: 'expenses', category: item.category }) : null}
            />
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
          <MerchantRow
            key={item.merchant}
            item={item}
            rank={i + 1}
            currency={data.currency}
            link={link(item.merchant, { type: 'expenses', q: item.merchant })}
          />
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
  debug: { fontSize: fontSizes.xs, color: colors.textSecondary, textAlign: 'center' },
  errorText: { fontSize: fontSizes.md, color: colors.textPrimary, textAlign: 'center' },
  stats: { flexDirection: 'row', gap: spacing.md },
  card: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.white, ...shadows.card },
  section: { fontSize: fontSizes.md, color: colors.textPrimary, marginBottom: spacing.xs },
  note: { fontSize: fontSizes.sm, color: colors.textSecondary, paddingVertical: spacing.sm },
});
