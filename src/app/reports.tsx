import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { screenTitle } from '@/components/screenTitle';
import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { showToast } from '@/components/Toast';
import { showCreditPrompt } from '@/components/CreditPrompt';
import { showUpgradePrompt } from '@/components/UpgradePrompt';
import { usePlan } from '@/features/plans/usePlan';
import { isAxiosError } from 'axios';

import { AUTH_BYPASS } from '@/config/flags';
import { exportReportCsv, exportReportPdf } from '@/features/reports/exportReport';
import { exportReportFromServer } from '@/features/reports/exportServer';
import {
  CategorySection,
  ComparisonSection,
  DebtSection,
  LifestyleSection,
  MerchantSection,
  MovementSection,
  PaymentMethodsSection,
  SavingsSection,
  SummarySection,
  WeeklySection,
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

  const { plan, can, refresh: refreshPlan } = usePlan();
  const advanced = can('advancedReports') === true;

  const onExport = async (kind: 'pdf' | 'csv', unlocked = false): Promise<void> => {
    if (!data || plan === null) return;
    // Exports are a Premium feature. A free user can pay with credits (or watch an ad to earn them) or go to the plans;
    // after paying, the export carries on at once. In demo mode there is no server, so the Premium message is shown.
    if (!unlocked && can('pdfExport') !== true) {
      if (AUTH_BYPASS) showUpgradePrompt('pdfExport');
      else showCreditPrompt('report_export', 'pdfExport', () => void refreshPlan().then(() => onExport(kind, true)));
      return;
    }
    setExporting(true);
    try {
      if (!AUTH_BYPASS) await exportReportFromServer(kind === 'pdf' ? 'pdf' : 'xlsx', data.period);
      else if (kind === 'pdf') await exportReportPdf(data, language);
      else await exportReportCsv(data);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 403) {
        showCreditPrompt('report_export', 'pdfExport', () => void refreshPlan().then(() => onExport(kind, true)));
        return;
      }
      // In development the real reason is shown and logged; users only see the general message.
      if (__DEV__) console.warn(`[reports] ${kind} export failed`, error);
      const reason = __DEV__ && error instanceof Error ? `: ${error.message}` : '';
      showToast(`${t(kind === 'pdf' ? 'reports.exportFailed' : 'reports.exportCsvFailed')}${reason}`);
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
        <AppText weight="bold" style={styles.title} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit>
          {t('reports.title')}
        </AppText>
        <Pressable
          onPress={() => onExport('csv')}
          disabled={!canExport}
          accessibilityRole="button"
          accessibilityLabel={t('reports.exportCsv')}
          accessibilityState={{ disabled: !canExport, busy: exporting }}
          style={[styles.export, !canExport && styles.disabled]}>
          <AppText weight="bold" style={styles.exportText}>
            {t(AUTH_BYPASS ? 'reports.exportCsv' : 'reports.exportExcel')}
          </AppText>
        </Pressable>
        <Pressable
          onPress={() => onExport('pdf')}
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
          {advanced ? (
            <>
              <CategorySection report={data} />
              <MerchantSection report={data} />
              <WeeklySection report={data} />
              <PaymentMethodsSection report={data} />
              <MovementSection report={data} />
              <LifestyleSection report={data} />
              <SavingsSection report={data} />
              <DebtSection report={data} />
              <ComparisonSection report={data} />
            </>
          ) : (
            // The Free plan has the basic report; the analytics are Premium.
            <Pressable
              onPress={() =>
                // Free users can unlock the analytics for 24 hours with credits; demo mode has no server, so it goes to the plans.
                AUTH_BYPASS
                  ? router.push({ pathname: '/plans', params: { feature: 'advancedReports' } })
                  : showCreditPrompt('insights', 'advancedReports', () => void refreshPlan())
              }
              accessibilityRole="button"
              accessibilityLabel={t('reports.premiumTitle')}
              style={styles.upsell}>
              <AppText weight="bold" style={styles.upsellTitle}>
                {t('reports.premiumTitle')}
              </AppText>
              <AppText style={styles.upsellBody}>{t('reports.premiumBody')}</AppText>
            </Pressable>
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
  disabled: { opacity: 0.3 },
  flip: { transform: [{ scaleX: -1 }] },
  title: { flex: 1, ...screenTitle },
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
  upsell: { gap: spacing.xs, padding: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.white },
  upsellTitle: { fontSize: fontSizes.md, color: colors.textPrimary },
  upsellBody: { fontSize: fontSizes.sm, color: colors.textSecondary },
  message: { gap: spacing.lg, alignItems: 'center', padding: spacing.xl, paddingVertical: spacing.xxxl },
  messageText: { fontSize: fontSizes.md, color: colors.textPrimary, textAlign: 'center' },
  content: { padding: spacing.xl, paddingTop: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxl },
});
