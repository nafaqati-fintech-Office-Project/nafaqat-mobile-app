import { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { getPushStatus, registerForPush, type PushStatus } from './push';
import { sendTestPush } from './pushApi';
import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { showToast } from '@/components/Toast';
import { AUTH_BYPASS } from '@/config/flags';
import type { TranslationKey } from '@/i18n';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, spacing } from '@/theme';

const STATUS_TEXT: Record<PushStatus, TranslationKey> = {
  on: 'push.statusOn',
  off: 'push.statusOff',
  denied: 'push.statusOff',
  blocked: 'push.statusBlocked',
  unavailable: 'push.statusUnavailable',
};

// Whether this phone gets alerts while the app is closed, with a way to turn that on and to try it.
export function PushSettingsCard() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void getPushStatus()
      .catch((): PushStatus => 'unavailable')
      .then((value) => active && setStatus(value));
    return () => {
      active = false;
    };
  }, []);

  const turnOn = useCallback(async () => {
    setBusy(true);
    const next = await registerForPush('now');
    setBusy(false);
    setStatus(next);
    if (next === 'off') showToast(t('notifications.actionFailed'));
  }, [t]);

  const test = useCallback(async () => {
    setBusy(true);
    try {
      const { accepted } = await sendTestPush();
      showToast(t(accepted > 0 ? 'push.testSent' : 'push.testNoDevice'));
    } catch {
      showToast(t('notifications.actionFailed'));
    } finally {
      setBusy(false);
    }
  }, [t]);

  if (!status) return null;

  return (
    <View style={styles.card}>
      <AppText weight="semibold" style={styles.title}>
        {t('push.title')}
      </AppText>
      <AppText style={styles.body}>{t(STATUS_TEXT[status])}</AppText>
      {(status === 'off' || status === 'denied') && (
        <PrimaryButton label={t('push.turnOn')} onPress={() => void turnOn()} loading={busy} />
      )}
      {status === 'blocked' && (
        <PrimaryButton label={t('push.openSettings')} onPress={() => void Linking.openSettings()} />
      )}
      {/* Bypass mode has no account on the server, so there is nobody to send a test to. */}
      {status === 'on' && !AUTH_BYPASS && (
        <PrimaryButton label={t('push.sendTest')} onPress={() => void test()} loading={busy} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    marginBottom: spacing.sm,
  },
  title: { fontSize: fontSizes.md, color: colors.textPrimary },
  body: { fontSize: fontSizes.xs, color: colors.textSecondary },
});
