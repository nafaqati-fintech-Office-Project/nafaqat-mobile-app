import { StatusBar } from 'expo-status-bar';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { DashboardHeader } from '@/features/dashboard/DashboardHeader';
import { DashboardSkeleton } from '@/features/dashboard/DashboardSkeleton';
import { Greeting } from '@/features/dashboard/Greeting';
import { SpendingCard } from '@/features/dashboard/SpendingCard';
import { StatGrid } from '@/features/dashboard/StatGrid';
import { SmsDevEntry } from '@/features/sms/SmsDevEntry';
import { useDashboard } from '@/features/dashboard/useDashboard';
import { useExitOnBack } from '@/hooks/useExitOnBack';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, spacing } from '@/theme';

export default function DashboardRoute() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data, loading, error, refresh } = useDashboard();

  useExitOnBack();

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading && data !== null} onRefresh={refresh} />}>
        <DashboardHeader />
        <Greeting name={user?.firstName ?? user?.username ?? ''} />
        <SmsDevEntry />
        {data ? (
          <>
            <SpendingCard data={data} />
            <StatGrid data={data} />
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
  content: { padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing.xxl },
  error: { gap: spacing.lg, paddingVertical: spacing.xxl },
  errorText: { fontSize: fontSizes.md, color: colors.textPrimary, textAlign: 'center' },
});
