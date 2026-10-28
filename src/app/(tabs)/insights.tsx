import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { SegmentedTabs, type SegmentedOption } from '@/components/SegmentedTabs';
import { CategoryTrendRow } from '@/features/insights/CategoryTrendRow';
import { InsightStatCard } from '@/features/insights/InsightStatCard';
import { MerchantRow } from '@/features/insights/MerchantRow';
import { mockInsights } from '@/features/insights/mock';
import { SpendingTrendCard } from '@/features/insights/SpendingTrendCard';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, shadows, spacing } from '@/theme';
import { formatMoney } from '@/utils/money';

type Tab = 'overview' | 'trends' | 'merchants';

const TABS: SegmentedOption<Tab>[] = [
  { value: 'overview', label: 'insights.tab.overview' },
  { value: 'trends', label: 'insights.tab.trends' },
  { value: 'merchants', label: 'insights.tab.merchants' },
];

// Design pass: hardcoded insights from mock.ts until the screen is wired to the reports service.
export default function InsightsRoute() {
  const { language, t } = useLanguage();
  const [tab, setTab] = useState<Tab>('overview');
  const data = mockInsights;

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppText weight="bold" style={styles.title}>
          {t('tabs.insights')}
        </AppText>
        <SegmentedTabs options={TABS} value={tab} onChange={setTab} />

        {tab === 'overview' && (
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
        )}

        {tab === 'trends' && (
          <View style={styles.card}>
            <AppText weight="bold" style={styles.section}>
              {t('insights.categoryTrends')}
            </AppText>
            {data.categoryTrends.map((item) => (
              <CategoryTrendRow key={item.category} item={item} currency={data.currency} />
            ))}
          </View>
        )}

        {tab === 'merchants' && (
          <View style={styles.card}>
            <AppText weight="bold" style={styles.section}>
              {t('insights.topMerchants')}
            </AppText>
            {data.merchants.map((item, i) => (
              <MerchantRow key={item.merchant} item={item} rank={i + 1} currency={data.currency} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgLight },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontSize: fontSizes.xl, color: colors.textPrimary },
  stats: { flexDirection: 'row', gap: spacing.md },
  card: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.white, ...shadows.card },
  section: { fontSize: fontSizes.md, color: colors.textPrimary, marginBottom: spacing.xs },
});
