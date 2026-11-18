import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { checkSmsPermission } from './smsPermission';
import { AppText } from '@/components/AppText';
import { SMS_TOOLS_ENABLED } from '@/config/flags';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';

// Asks for SMS access. Shown on Android only until it is granted; after that the bank messages are read automatically
// (see smsSync), so there is nothing left to press.
export function SmsDevEntry() {
  const { t } = useLanguage();
  const [needed, setNeeded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!SMS_TOOLS_ENABLED || Platform.OS !== 'android') return;
      void checkSmsPermission().then((status) => setNeeded(status !== 'granted'));
    }, []),
  );

  if (!needed) return null;

  return (
    <Pressable onPress={() => router.push('/sms-permission')} accessibilityRole="button" style={styles.row}>
      <AppText weight="semibold" style={styles.text}>
        {t('dashboard.smsDev')}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: sizes.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.lg,
  },
  text: { fontSize: fontSizes.sm, color: colors.primary },
});
