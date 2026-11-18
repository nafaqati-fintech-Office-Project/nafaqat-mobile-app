import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { styles } from './SmsPermissionScreen.styles';
import { checkSmsPermission, requestSmsPermission, type SmsPermissionStatus } from './smsPermission';
import { ensureSmsSync, setSmsAutoOff } from './smsSync';
import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, gradients, sizes } from '@/theme';


export function SmsPermissionScreen() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [status, setStatus] = useState<SmsPermissionStatus | null>(null);
  const [busy, setBusy] = useState(false);

  // Allowing SMS access starts the automatic import and watching (see smsSync), then returns to the app.
  const done = useCallback(() => {
    if (user) void setSmsAutoOff(false).then(() => ensureSmsSync(user.id));
    router.replace('/home');
  }, [user]);

  useEffect(() => {
    checkSmsPermission().then((result) => {
      if (result === 'granted') done();
    });
  }, [done]);

  const allow = async () => {
    setBusy(true);
    const result = await requestSmsPermission();
    setBusy(false);
    setStatus(result);
    if (result === 'granted') done();
  };

  const notice =
    Platform.OS !== 'android'
      ? t('sms.androidOnly')
      : status === 'blocked'
        ? t('sms.blocked')
        : status === 'denied'
          ? t('sms.denied')
          : null;

  return (
    <LinearGradient colors={gradients.onboarding} style={styles.fill}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.fill}>
        <View style={styles.body}>
          <View style={styles.iconWrap}>
            <Icon name="sms" color={colors.primary} size={sizes.logoMini * 2} />
          </View>
          <AppText weight="bold" style={styles.title}>
            {t('sms.title')}
          </AppText>
          <AppText style={styles.text}>{t('sms.body')}</AppText>
          {notice && <AppText style={styles.notice}>{notice}</AppText>}
        </View>
        <View style={styles.footer}>
          {status === 'blocked' && (
            <PrimaryButton label={t('sms.openSettings')} onPress={() => Linking.openSettings()} />
          )}
          {status !== 'blocked' && Platform.OS === 'android' && (
            <PrimaryButton label={t('sms.allow')} onPress={allow} loading={busy} />
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
