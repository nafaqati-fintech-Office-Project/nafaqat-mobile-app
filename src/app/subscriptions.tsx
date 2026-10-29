import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { SegmentedTabs, type SegmentedOption } from '@/components/SegmentedTabs';
import { showToast } from '@/components/Toast';
import { mockSubscriptions } from '@/features/subscriptions/mock';
import { summarize } from '@/features/subscriptions/subscriptionMath';
import { SubscriptionInsights } from '@/features/subscriptions/SubscriptionInsights';
import { SubscriptionRow } from '@/features/subscriptions/SubscriptionRow';
import { SubscriptionSummaryCards } from '@/features/subscriptions/SubscriptionSummaryCards';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, shadows, sizes, spacing } from '@/theme';

type Tab = 'active' | 'cancelled';

// Sample data for now (layout from the design reference); #26 connects it to the subscription service.
export default function SubscriptionsRoute() {
  const { t, isRTL } = useLanguage();
  const [tab, setTab] = useState<Tab>('active');
  const [onlyUnused, setOnlyUnused] = useState(false);
  const summary = useMemo(() => summarize(mockSubscriptions, 'SAR'), []);

  const tabs: SegmentedOption<Tab>[] = [
    { value: 'active', label: 'subscriptions.active', count: summary.active.length },
    { value: 'cancelled', label: 'subscriptions.cancelled', count: summary.cancelled.length },
  ];
  const rows = tab === 'cancelled' ? summary.cancelled : onlyUnused ? summary.unused : summary.active;

  const findUnused = () => {
    setTab('active');
    setOnlyUnused((current) => !current);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
          accessibilityRole="button"
          accessibilityLabel={t('budget.back')}
          style={styles.side}>
          {/* The chevron points right; flip it to point back in left-to-right layouts. */}
          <View style={!isRTL && styles.flip}>
            <Icon name="chevron" color={colors.textPrimary} size={sizes.iconLg} />
          </View>
        </Pressable>
        <View style={styles.titles}>
          <AppText weight="bold" style={styles.title} accessibilityRole="header">
            {t('subscriptions.title')}
          </AppText>
          <AppText style={styles.subtitle}>{t('subscriptions.subtitle')}</AppText>
        </View>
        <Pressable
          onPress={() => showToast(t('subscriptions.addSoon'))}
          accessibilityRole="button"
          accessibilityLabel={t('subscriptions.add')}
          style={styles.add}>
          <AppText weight="bold" style={styles.addText}>
            {`+ ${t('subscriptions.add')}`}
          </AppText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SubscriptionSummaryCards summary={summary} showingUnused={onlyUnused} onFindUnused={findUnused} />

        <SegmentedTabs
          options={tabs}
          value={tab}
          onChange={(next) => {
            setTab(next);
            setOnlyUnused(false);
          }}
        />

        <View style={styles.list}>
          {onlyUnused && tab === 'active' && (
            <AppText style={styles.filterNote}>{t('subscriptions.unusedNote')}</AppText>
          )}
          {rows.length > 0 ? (
            rows.map((item, index) => (
              <View key={item.id} style={index > 0 && styles.divider}>
                <SubscriptionRow item={item} />
              </View>
            ))
          ) : (
            <AppText style={styles.empty}>
              {t(tab === 'active' ? 'subscriptions.emptyActive' : 'subscriptions.emptyCancelled')}
            </AppText>
          )}
        </View>

        <SubscriptionInsights summary={summary} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgLight },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg },
  side: { width: sizes.touchMin, height: sizes.touchMin, alignItems: 'center', justifyContent: 'center' },
  flip: { transform: [{ scaleX: -1 }] },
  titles: { flex: 1 },
  title: { fontSize: fontSizes.lg, color: colors.textPrimary },
  subtitle: { fontSize: fontSizes.xs, color: colors.textSecondary },
  add: {
    minHeight: sizes.touchMin - spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  addText: { fontSize: fontSizes.sm, color: colors.white },
  content: { padding: spacing.xl, paddingTop: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxl },
  list: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, borderRadius: radius.xl, backgroundColor: colors.white, ...shadows.card },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  filterNote: { fontSize: fontSizes.xs, color: colors.orange, paddingTop: spacing.md },
  empty: { fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xl },
});
