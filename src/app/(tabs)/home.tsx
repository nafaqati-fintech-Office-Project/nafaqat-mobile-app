import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { FadeInCard } from '@/components/FadeInCard';
import { PeriodTabs } from '@/components/PeriodTabs';
import { PrimaryButton } from '@/components/PrimaryButton';
import { BudgetAlertStrip } from '@/features/dashboard/BudgetAlertStrip';
import { CashFlowCard } from '@/features/dashboard/CashFlowCard';
import { CategoryBreakdownCard } from '@/features/dashboard/CategoryBreakdownCard';
import { HeatmapCard } from '@/features/dashboard/HeatmapCard';
import { SavingsTrendCard } from '@/features/dashboard/SavingsTrendCard';
import { DashboardHeader } from '@/features/dashboard/DashboardHeader';
import { DashboardSkeleton } from '@/features/dashboard/DashboardSkeleton';
import { Greeting } from '@/features/dashboard/Greeting';
import { RecentTransactionsCard } from '@/features/dashboard/RecentTransactionsCard';
import { SpendingCard } from '@/features/dashboard/SpendingCard';
import { StatGrid } from '@/features/dashboard/StatGrid';
import { CaptureReminderBanner } from '@/features/iosCapture/CaptureReminderBanner';
import { SmsDevEntry } from '@/features/sms/SmsDevEntry';
import { isEmptyDashboard, WIDER_RANGE } from '@/features/dashboard/dashboardRange';
import { useDashboard } from '@/features/dashboard/useDashboard';
import type { DashboardData } from '@/features/dashboard/types';
import type { Period } from '@/features/insights/insightsBuilder';
import { useExitOnBack } from '@/hooks/useExitOnBack';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, spacing } from '@/theme';

export default function DashboardRoute() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>(1);
  // True until the person picks a range themselves; then the screen no longer widens it on its own.
  const [auto, setAuto] = useState(true);
  // A range with nothing in it is followed by the next wider one, so a new account whose messages are from
  // earlier months does not open on an empty screen.
  const widen = useCallback(
    (loadedPeriod: Period, loaded: DashboardData) => {
      const next = WIDER_RANGE[loadedPeriod];
      if (auto && next && isEmptyDashboard(loaded)) setPeriod(next);
    },
    [auto],
  );
  const { data, loading, error, refresh, reloadSilently } = useDashboard(period, widen);
  // The pull-down spinner only shows for a pull by the person, never for the load that runs on its own.
  const [pulling, setPulling] = useState(false);
  const pull = useCallback(async () => {
    setPulling(true);
    try {
      await refresh();
    } finally {
      setPulling(false);
    }
  }, [refresh]);
  const pick = (next: Period) => {
    setAuto(false);
    setPeriod(next);
  };

  useExitOnBack();

  // Coming back to the tab picks up transactions synced meanwhile; the first focus is the initial load.
  const focused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focused.current) void reloadSilently();
      focused.current = true;
    }, [reloadSilently]),
  );

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={pull} />}>
        <DashboardHeader />
        <Greeting name={user?.firstName ?? ''} />
        <SmsDevEntry />
        <CaptureReminderBanner />
        <BudgetAlertStrip />
        <PeriodTabs value={period} onChange={pick} />
        {data && auto && period > 1 && !isEmptyDashboard(data) && (
          <AppText style={styles.widened}>{t('dashboard.widened', { months: String(period) })}</AppText>
        )}
        {data ? (
          <>
            <FadeInCard index={0}>
              <SpendingCard data={data} />
            </FadeInCard>
            <FadeInCard index={1}>
              <StatGrid data={data} />
            </FadeInCard>
            <FadeInCard index={2}>
              <CashFlowCard data={data} />
            </FadeInCard>
            <FadeInCard index={3}>
              <HeatmapCard data={data} />
            </FadeInCard>
            <FadeInCard index={4}>
              <SavingsTrendCard data={data} />
            </FadeInCard>
            <FadeInCard index={5}>
              <CategoryBreakdownCard data={data} />
            </FadeInCard>
            <FadeInCard index={6}>
              <RecentTransactionsCard data={data} />
            </FadeInCard>
          </>
        ) : error ? (
          <View style={styles.error}>
            <AppText weight="medium" style={styles.errorText}>
              {t('dashboard.loadError')}
            </AppText>
            <PrimaryButton label={t('dashboard.retry')} onPress={refresh} loading={loading} />
          </View>
        ) : (
          <DashboardSkeleton />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgLight },
  content: { padding: spacing.xl, paddingTop: 0, gap: spacing.xl, paddingBottom: spacing.xxl },
  widened: { fontSize: fontSizes.xs, color: colors.textSecondary, textAlign: 'center' },
  error: { gap: spacing.lg, paddingVertical: spacing.xxl },
  errorText: { fontSize: fontSizes.md, color: colors.textPrimary, textAlign: 'center' },
});
