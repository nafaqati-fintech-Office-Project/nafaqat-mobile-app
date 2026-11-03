import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { showToast } from '@/components/Toast';
import { PushSettingsCard } from '@/features/notifications/PushSettingsCard';
import { isMandatory, useNotificationPreferences } from '@/features/notifications/useNotificationPreferences';
import type { NotificationType } from '@/features/notifications/types';
import type { TranslationKey } from '@/i18n';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';

const LABELS: Record<NotificationType, { title: TranslationKey; body: TranslationKey }> = {
  BUDGET_THRESHOLD: { title: 'notifications.type.budgetThreshold', body: 'notifications.type.budgetThresholdBody' },
  BUDGET_EXCEEDED: { title: 'notifications.type.budgetExceeded', body: 'notifications.type.budgetExceededBody' },
  LARGE_TRANSACTION: { title: 'notifications.type.largeTransaction', body: 'notifications.type.largeTransactionBody' },
  TRANSACTION_ALERT: { title: 'notifications.type.transactionAlert', body: 'notifications.type.transactionAlertBody' },
  FAMILY: { title: 'notifications.type.family', body: 'notifications.type.familyBody' },
  SUBSCRIPTION_RENEWAL: {
    title: 'notifications.type.subscriptionRenewal',
    body: 'notifications.type.subscriptionRenewalBody',
  },
  GOAL_MILESTONE: { title: 'notifications.type.goalMilestone', body: 'notifications.type.goalMilestoneBody' },
  SECURITY_ALERT: { title: 'notifications.type.security', body: 'notifications.type.securityBody' },
  SYSTEM: { title: 'notifications.type.system', body: 'notifications.type.systemBody' },
};

export default function NotificationSettingsRoute() {
  const { t, isRTL } = useLanguage();
  const { prefs, status, saving, retry, toggle } = useNotificationPreferences();

  const onToggle = async (type: NotificationType, enabled: boolean) => {
    if (!(await toggle(type, enabled))) showToast(t('notifications.actionFailed'));
  };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/more'))}
          accessibilityRole="button"
          accessibilityLabel={t('budget.back')}
          style={styles.back}>
          {/* The chevron points right; flip it to point back in left-to-right layouts. */}
          <View style={!isRTL && styles.flip}>
            <Icon name="chevron" color={colors.textPrimary} size={sizes.iconLg} />
          </View>
        </Pressable>
        <AppText weight="bold" style={styles.title} accessibilityRole="header">
          {t('notifications.settings')}
        </AppText>
        <View style={styles.back} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {status === 'loading' ? (
          <ActivityIndicator color={colors.primary} style={styles.spinner} />
        ) : status === 'error' ? (
          <View style={styles.error}>
            <AppText weight="medium" style={styles.errorText}>
              {t('notifications.settingsLoadError')}
            </AppText>
            <PrimaryButton label={t('budget.retry')} onPress={retry} />
          </View>
        ) : (
          <>
            <PushSettingsCard />
            <AppText style={styles.intro}>{t('notifications.settingsIntro')}</AppText>
            {prefs.map(({ type, enabled }) => {
              const mandatory = isMandatory(type);
              const label = LABELS[type];
              return (
                <View key={type} style={styles.row}>
                  <View style={styles.texts}>
                    <AppText weight="semibold" style={styles.rowTitle}>
                      {t(label.title)}
                    </AppText>
                    <AppText style={styles.rowBody}>
                      {mandatory ? t('notifications.alwaysOn') : t(label.body)}
                    </AppText>
                  </View>
                  <Switch
                    value={mandatory || enabled}
                    disabled={mandatory || saving === type}
                    onValueChange={(value) => void onToggle(type, value)}
                    trackColor={{ true: colors.primary, false: colors.border }}
                    accessibilityLabel={t(label.title)}
                  />
                </View>
              );
            })}
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
  content: { padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.sm, paddingBottom: spacing.xxl },
  spinner: { marginTop: spacing.xxxl },
  error: { gap: spacing.lg, paddingVertical: spacing.xxl },
  errorText: { fontSize: fontSizes.md, color: colors.textPrimary, textAlign: 'center' },
  intro: { fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
  },
  texts: { flex: 1, gap: spacing.xxs },
  rowTitle: { fontSize: fontSizes.md, color: colors.textPrimary },
  rowBody: { fontSize: fontSizes.xs, color: colors.textSecondary },
});
