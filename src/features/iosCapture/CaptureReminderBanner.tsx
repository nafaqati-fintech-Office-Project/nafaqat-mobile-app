import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { captureConfig } from './config';
import { bannerFlows, dismissBanner } from './reminder';
import { needsRetest, type AutomationFlow } from './status';
import { isCaptureAvailable } from '../../../modules/nafaqati-capture';
import { AppText } from '@/components/AppText';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, lineHeights, radius, sizes, spacing } from '@/theme';

// Home: shown when an automation that used to deliver has gone quiet, or after an iOS update (the connection test should
// be run again). Dismissing hides it for a week.
export function CaptureReminderBanner() {
  const { t } = useLanguage();
  const [flows, setFlows] = useState<AutomationFlow[]>([]);
  const [retest, setRetest] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!isCaptureAvailable()) return;
      void Promise.all([bannerFlows(), needsRetest()]).then(([f, r]) => {
        setFlows(f);
        setRetest(r);
      });
    }, []),
  );

  if (flows.length === 0 && !retest) return null;

  const dismiss = () => {
    setFlows([]);
    setRetest(false);
    flows.forEach((flow) => void dismissBanner(flow));
  };

  return (
    <View style={styles.card} accessibilityRole="alert">
      <AppText style={styles.text}>
        {retest ? t('iosSetup.status.iosUpdated') : t('iosSetup.reminder.body', { days: String(captureConfig().reminderDays) })}
      </AppText>
      <View style={styles.actions}>
        <Pressable onPress={() => router.push('/ios-sms-setup')} accessibilityRole="button" accessibilityLabel={t('iosSetup.reminder.action')} style={styles.button}>
          <AppText weight="semibold" style={styles.action}>
            {t('iosSetup.reminder.action')}
          </AppText>
        </Pressable>
        <Pressable onPress={dismiss} accessibilityRole="button" accessibilityLabel={t('iosSetup.skip')} style={styles.button}>
          <AppText weight="semibold" style={styles.dismiss}>
            {t('iosSetup.skip')}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.primarySoft },
  text: { fontSize: fontSizes.sm, lineHeight: lineHeights.sm, color: colors.textPrimary },
  actions: { flexDirection: 'row', gap: spacing.lg },
  button: { minHeight: sizes.touchMin, justifyContent: 'center' },
  action: { fontSize: fontSizes.sm, color: colors.primary },
  dismiss: { fontSize: fontSizes.sm, color: colors.textSecondary },
});
