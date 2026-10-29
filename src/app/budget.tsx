import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, type ComponentRef } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { BudgetSummaryCard } from '@/features/budget/BudgetSummaryCard';
import { CategoryBudgetRow } from '@/features/budget/CategoryBudgetRow';
import { useBudget } from '@/features/budget/useBudget';
import { OVERALL } from '@/features/notifications/notificationLink';
import { categoryFromCode } from '@/features/transactions/categoryDisplay';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, shadows, sizes, spacing } from '@/theme';

export default function BudgetRoute() {
  const { t, isRTL } = useLanguage();
  const { budget, status, refreshing, refresh, retry, reload } = useBudget();

  // Opened from a budget alert: point out its category, or the month card for the whole budget.
  const params = useLocalSearchParams<{ highlight?: string; at?: string }>();
  const flashKey = params.highlight ? `${params.highlight}:${params.at ?? ''}` : null;
  const target =
    !params.highlight || params.highlight === OVERALL
      ? null
      : (categoryFromCode(params.highlight) ?? params.highlight);
  const flashOverall = flashKey !== null && !target;
  const targetFound = target !== null && (budget?.categories.some((item) => item.category === target) ?? false);

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
        <AppText weight="bold" style={styles.title}>
          {t('budget.title')}
        </AppText>
        <View style={styles.back} />
      </View>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
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
          </View>
        ) : (
          <>
            <BudgetSummaryCard budget={budget} flashKey={flashOverall ? flashKey : null} />
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
                    <CategoryBudgetRow
                      item={item}
                      currency={budget.currency}
                      flashKey={targetFound && item.category === target ? flashKey : null}
                    />
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
  title: { flex: 1, textAlign: 'center', fontSize: fontSizes.lg, color: colors.textPrimary },
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
});
