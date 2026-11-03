import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { showToast } from '@/components/Toast';
import { canUse } from '@/features/plans/plans';
import { usePlan } from '@/features/plans/usePlan';
import { exportReportPdf } from '@/features/reports/exportReport';
import {
  CategorySection,
  ComparisonSection,
  LifestyleSection,
  MerchantSection,
  SavingsSection,
  SummarySection,
} from '@/features/reports/ReportSections';
import { useReport } from '@/features/reports/useReport';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';
import { monthName } from '@/utils/intl';

export default function ReportsRoute() {
  const { t, language, isRTL } = useLanguage();
  const { period, data, status, refreshing, refresh, retry, previous, next, canGoPrevious, canGoNext } = useReport();
  const title = period ? `${monthName(period.month, period.year, language)} ${period.year}` : '';
  const [exporting, setExporting] = useState(false);
  // Only a fully loaded report is exported, so the PDF never has half the data.
  const canExport = status === 'ready' && !!data && !refreshing && !exporting;

  const { plan } = usePlan();

  const onExport = async () => {
    if (!data || plan === null) return;
    // PDF export is a Premium feature: free users see the plans with it highlighted.
    if (!canUse(plan, 'pdfExport')) {
      router.push({ pathname: '/plans', params: { feature: 'pdfExport' } });
      return;
    }
    setExporting(true);
    try {
      await exportReportPdf(data, language);
    } catch (error) {
      // In development the real reason is shown and logged; users only see the general message.
      if (__DEV__) console.warn('[reports] PDF export failed', error);
      const reason = __DEV__ && error instanceof Error ? `: ${error.message}` : '';
      showToast(`${t('reports.exportFailed')}${reason}`);
    } finally {
      setExporting(false);
    }
  };

  // The chevron points right; flip it for "back" in left-to-right layouts and for "next" in right-to-left ones.
  const arrow = (enabled: boolean, flip: boolean, label: string, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      style={[styles.side, !enabled && styles.disabled]}>
      <View style={flip && styles.flip}>
        <Icon name="chevron" color={colors.textPrimary} size={sizes.iconLg} />
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
          accessibilityRole="button"
          accessibilityLabel={t('budget.back')}
          style={styles.side}>
          <View style={!isRTL && styles.flip}>
            <Icon name="chevron" color={colors.textPrimary} size={sizes.iconLg} />
          </View>
        </Pressable>
        <AppText weight="bold" style={styles.title} accessibilityRole="header">
          {t('reports.title')}
        </AppText>
        <Pressable
          onPress={onExport}
          disabled={!canExport}
          accessibilityRole="button"
          accessibilityLabel={t('reports.exportPdf')}
          accessibilityState={{ disabled: !canExport, busy: exporting }}
          style={[styles.export, !canExport && styles.disabled]}>
          {exporting ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <AppText weight="bold" style={styles.exportText}>
              {t('reports.exportPdf')}
            </AppText>
          )}
        </Pressable>
      </View>

      <View style={styles.picker}>
        {arrow(canGoPrevious, !isRTL, t('reports.previousMonth'), previous)}
        <AppText weight="semibold" style={styles.month}>
          {title}
        </AppText>
        {arrow(canGoNext, isRTL, t('reports.nextMonth'), next)}
      </View>

      {status === 'loading' ? (
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      ) : status === 'error' || !data ? (
        <View style={styles.message}>
          <AppText weight="medium" style={styles.messageText}>
            {t('reports.loadError')}
          </AppText>
          <PrimaryButton label={t('insights.retry')} onPress={retry} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
          <SummarySection report={data} />
          <CategorySection report={data} />
          <MerchantSection report={data} />
          <LifestyleSection report={data} />
          <SavingsSection report={data} />
          <ComparisonSection report={data} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgLight },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg },
  side: { width: sizes.touchMin, height: sizes.touchMin, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.3 },
  flip: { transform: [{ scaleX: -1 }] },
  title: { flex: 1, fontSize: fontSizes.lg, color: colors.textPrimary },
  picker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg },
  month: { fontSize: fontSizes.md, color: colors.textPrimary },
  export: {
    minWidth: sizes.touchMin + spacing.xl,
    minHeight: sizes.touchMin - spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  exportText: { fontSize: fontSizes.sm, color: colors.white },
  spinner: { marginTop: spacing.xxxl },
  message: { gap: spacing.lg, alignItems: 'center', padding: spacing.xl, paddingVertical: spacing.xxxl },
  messageText: { fontSize: fontSizes.md, color: colors.textPrimary, textAlign: 'center' },
  content: { padding: spacing.xl, paddingTop: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxl },
});
