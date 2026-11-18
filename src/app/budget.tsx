import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { screenTitle } from '@/components/screenTitle';
import { Icon } from '@/components/Icon';
import { PeriodTabs } from '@/components/PeriodTabs';
import { PrimaryButton } from '@/components/PrimaryButton';
import { BudgetSummaryCard } from '@/features/budget/BudgetSummaryCard';
import { CategoryBudgetRow } from '@/features/budget/CategoryBudgetRow';
import { DrillPressable } from '@/features/transactions/DrillPressable';
import { canOpenCategory, dayKey, type TransactionLink } from '@/features/transactions/transactionLinks';
import { useBudget } from '@/features/budget/useBudget';
import type { Period } from '@/features/insights/insightsBuilder';
import { OVERALL } from '@/features/notifications/notificationLink';
import { categoryFromCode, categoryLabelKey } from '@/features/transactions/categoryDisplay';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, shadows, sizes, spacing } from '@/theme';

export default function BudgetRoute() {
  const { t, isRTL } = useLanguage();
  const [period, setPeriod] = useState<Period>(1);
  const { budget, status, refreshing, refresh, retry, reload } = useBudget(period);

  // Opened from a budget alert: point out its category, or the month card for the whole budget.
  const params = useLocalSearchParams<{ highlight?: string; at?: string }>();
  const flashKey = params.highlight ? `${params.highlight}:${params.at ?? ''}` : null;
  const target =
    !params.highlight || params.highlight === OVERALL
      ? null
      : (categoryFromCode(params.highlight) ?? params.highlight);
  const flashOverall = flashKey !== null && !target;
  const targetFound = target !== null && (budget?.categories.some((item) => item.category === target) ?? false);

  // The budget card and each category open the expenses counted against them (the budget's own days).
  const budgetLink = (label: string, category?: string): TransactionLink | null =>
    budget
      ? {
          type: 'expenses',
          category,
          from: dayKey(budget.startDate),
          to: dayKey(budget.endDate),
          title: `${label} · ${dayKey(budget.startDate)} – ${dayKey(budget.endDate)}`,
        }
      : null;
  const categoryName = (category: string) => {
    const key = categoryLabelKey(category);
    return key ? t(key) : category;
  };

  // Where the category rows are, to scroll the alert's row into view once per alert.
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const rowsY = useRef<number | null>(null);
  const rowY = useRef<Record<string, number>>({});
  const scrolledKey = useRef<string | null>(null);
  // Called from both layout events, since either can come first.
  const scrollToTarget = useCallback(() => {
    if (!flashKey || !target || scrolledKey.current === flashKey || rowsY.current === null) return;
    const y = rowY.current[target];
    if (y === undefined) return;
    scrolledKey.current = flashKey;
    scrollRef.current?.scrollTo({ y: Math.max(0, rowsY.current + y - spacing.xxxl), animated: true });
  }, [flashKey, target]);

  // Coming back to the screen picks up spending synced meanwhile; the first focus is the initial load.
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
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
          accessibilityRole="button"
          accessibilityLabel={t('budget.back')}
          style={styles.back}>
          {/* The chevron points right; flip it to point back in left-to-right layouts. */}
          <View style={!isRTL && styles.flip}>
            <Icon name="chevron" color={colors.textPrimary} size={sizes.iconLg} />
          </View>
        </Pressable>
        <AppText weight="bold" style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
          {t('budget.title')}
        </AppText>
        {budget ? (
          <Pressable
            onPress={() => router.push('/budget-edit')}
            accessibilityRole="button"
            accessibilityLabel={t('budget.edit')}
            style={styles.back}>
            <Icon name="pencil" color={colors.textPrimary} size={sizes.iconLg} />
          </Pressable>
        ) : (
          <View style={styles.back} />
        )}
      </View>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <PeriodTabs value={period} onChange={setPeriod} />
        {status === 'loading' ? (
          <ActivityIndicator color={colors.primary} style={styles.spinner} />
        ) : status === 'error' ? (
          <View style={styles.error}>
            <AppText weight="medium" style={styles.messageTitle}>
              {t('budget.loadError')}
            </AppText>
            <PrimaryButton label={t('budget.retry')} onPress={retry} />
          </View>
        ) : !budget ? (
          <View style={[styles.card, styles.message]}>
            <View style={styles.emptyIcon}>
              <Icon name="budget" color={colors.violet} size={sizes.iconLg} />
            </View>
            <AppText weight="bold" style={styles.messageTitle}>
              {t('budget.empty.title')}
            </AppText>
            <AppText style={styles.messageBody}>{t('budget.empty.body')}</AppText>
            <View style={styles.createButton}>
              <PrimaryButton label={t('budget.create')} onPress={() => router.push('/budget-edit')} />
            </View>
          </View>
        ) : (
          <>
            <DrillPressable link={budgetLink(t('budget.title'))}>
              <BudgetSummaryCard budget={budget} flashKey={flashOverall ? flashKey : null} />
            </DrillPressable>
            <View
              onLayout={(event) => {
                rowsY.current = event.nativeEvent.layout.y;
                scrollToTarget();
              }}>
              <AppText weight="bold" style={styles.section}>
                {t('budget.categories')}
              </AppText>
              {budget.categories.length > 0 ? (
                budget.categories.map((item) => (
                  <View
                    key={item.category}
                    onLayout={(event) => {
                      rowY.current[item.category] = event.nativeEvent.layout.y;
                      if (item.category === target) scrollToTarget();
                    }}>
                    <DrillPressable
                      link={
                        canOpenCategory(item.category)
                          ? budgetLink(categoryName(item.category), item.category)
                          : null
                      }>
                      <CategoryBudgetRow
                        item={item}
                        currency={budget.currency}
                        flashKey={targetFound && item.category === target ? flashKey : null}
                      />
                    </DrillPressable>
                  </View>
                ))
              ) : (
                <AppText style={styles.messageBody}>{t('budget.noCategories')}</AppText>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgLight },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg },
  back: { width: sizes.touchMin, height: sizes.touchMin, alignItems: 'center', justifyContent: 'center' },
  flip: { transform: [{ scaleX: -1 }] },
  title: { flex: 1, ...screenTitle },
  content: { flexGrow: 1, padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.xl, paddingBottom: spacing.xxl },
  spinner: { marginTop: spacing.xxxl },
  card: { padding: spacing.xl, borderRadius: radius.lg, backgroundColor: colors.white, ...shadows.card },
  error: { gap: spacing.lg, paddingVertical: spacing.xxl },
  message: { gap: spacing.md, alignItems: 'center', paddingVertical: spacing.xxl },
  emptyIcon: {
    width: sizes.iconTile,
    height: sizes.iconTile,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.violetSoft,
  },
  messageTitle: { fontSize: fontSizes.md, color: colors.textPrimary, textAlign: 'center' },
  messageBody: { fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center' },
  section: { fontSize: fontSizes.md, color: colors.textPrimary, marginBottom: spacing.xs },
  createButton: { alignSelf: 'stretch', marginTop: spacing.sm },
});
