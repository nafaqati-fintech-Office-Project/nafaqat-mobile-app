import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { screenTitle } from '@/components/screenTitle';
import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SegmentedTabs, type SegmentedOption } from '@/components/SegmentedTabs';
import { GoalCard, GoalProgressBar } from '@/features/goals/GoalCard';
import { mainCurrency, totalsOf } from '@/features/goals/goalMath';
import type { GoalStatus } from '@/features/goals/types';
import { useGoals } from '@/features/goals/useGoals';
import { toMinor } from '@/features/subscriptions/subscriptionMath';
import type { TranslationKey } from '@/i18n';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, shadows, sizes, spacing } from '@/theme';
import { formatMoney } from '@/utils/money';

const EMPTY: Record<GoalStatus, TranslationKey> = {
  ACTIVE: 'goals.emptyActive',
  COMPLETED: 'goals.emptyCompleted',
  CANCELLED: 'goals.emptyCancelled',
};

export default function GoalsRoute() {
  const { language, t, isRTL } = useLanguage();
  const { goals, status, refreshing, refresh, retry, reload } = useGoals();
  const [tab, setTab] = useState<GoalStatus>('ACTIVE');

  // Coming back from a goal or the form shows the change; the first focus is the initial load.
  const focused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focused.current) void reload();
      focused.current = true;
    }, [reload]),
  );

  const totals = useMemo(() => totalsOf(goals, mainCurrency(goals)), [goals]);
  const count = (s: GoalStatus) => goals.filter((g) => g.status === s).length;
  const tabs: SegmentedOption<GoalStatus>[] = [
    { value: 'ACTIVE', label: 'goals.status.active', count: count('ACTIVE') },
    { value: 'COMPLETED', label: 'goals.status.completed', count: count('COMPLETED') },
    { value: 'CANCELLED', label: 'goals.status.cancelled', count: count('CANCELLED') },
  ];
  const rows = goals.filter((g) => g.status === tab);
  const money = (amount: string) => formatMoney(amount, totals.currency, language);
  const target = toMinor(totals.target, totals.currency);
  const overall = target > 0 ? Math.min(Math.floor((toMinor(totals.saved, totals.currency) * 100) / target), 100) : 0;

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
          <AppText weight="bold" style={styles.title} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit>
            {t('goals.title')}
          </AppText>
        </View>
        <Pressable
          onPress={() => router.push('/goal-edit')}
          accessibilityRole="button"
          accessibilityLabel={t('goals.newTitle')}
          style={styles.add}>
          <AppText weight="bold" style={styles.addText}>
            {`+ ${t('goals.new')}`}
          </AppText>
        </Pressable>
      </View>
      <AppText style={styles.subtitle}>{t('goals.subtitle')}</AppText>

      {status === 'loading' ? (
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      ) : status === 'error' ? (
        <View style={styles.message}>
          <AppText weight="medium" style={styles.messageTitle}>
            {t('goals.loadError')}
          </AppText>
          <PrimaryButton label={t('budget.retry')} onPress={retry} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
          {totals.activeCount > 0 && (
            <View style={styles.summary}>
              <AppText style={styles.summaryLabel}>{t('goals.totalSaved')}</AppText>
              <AppText weight="bold" style={styles.summaryAmount}>
                {money(totals.saved)}
              </AppText>
              <AppText style={styles.summaryLabel}>
                {t('goals.ofTarget', { amount: money(totals.target), count: String(totals.activeCount) })}
              </AppText>
              <GoalProgressBar percent={overall} status="ACTIVE" />
            </View>
          )}

          <SegmentedTabs options={tabs} value={tab} onChange={setTab} />

          {rows.length > 0 ? (
            rows.map((goal) => (
              <GoalCard key={goal.id} goal={goal} onPress={() => router.push({ pathname: '/goal', params: { id: goal.id } })} />
            ))
          ) : (
            <View style={styles.empty}>
              <AppText style={styles.emptyText}>{t(EMPTY[tab])}</AppText>
              {tab === 'ACTIVE' && <PrimaryButton label={t('goals.newTitle')} onPress={() => router.push('/goal-edit')} />}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgLight },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg },
  side: { width: sizes.touchMin, height: sizes.touchMin, alignItems: 'center', justifyContent: 'center' },
  flip: { transform: [{ scaleX: -1 }] },
  titles: { flex: 1 },
  title: { ...screenTitle },
  subtitle: { fontSize: fontSizes.xs, color: colors.textSecondary, paddingHorizontal: spacing.xl },
  add: {
    minHeight: sizes.touchMin - spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  addText: { fontSize: fontSizes.sm, color: colors.white },
  spinner: { marginTop: spacing.xxxl },
  message: { gap: spacing.lg, alignItems: 'center', padding: spacing.xl, paddingVertical: spacing.xxxl },
  messageTitle: { fontSize: fontSizes.md, color: colors.textPrimary, textAlign: 'center' },
  content: { padding: spacing.xl, paddingTop: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxl },
  summary: { padding: spacing.lg, gap: spacing.xs, borderRadius: radius.xl, backgroundColor: colors.white, ...shadows.card },
  summaryLabel: { fontSize: fontSizes.xs, color: colors.textSecondary },
  summaryAmount: { fontSize: fontSizes.xl, color: colors.textPrimary },
  empty: { gap: spacing.lg, paddingVertical: spacing.xl },
  emptyText: { fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center' },
});
