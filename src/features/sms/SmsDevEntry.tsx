import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';

export function SmsDevEntry() {
  const { t } = useLanguage();
  if (!__DEV__) return null;

  return (
    <Pressable
      onPress={() => router.push('/sms-permission')}
      accessibilityRole="button"
      style={styles.row}>
      <AppText weight="medium" style={styles.text}>
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
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    paddingHorizontal: spacing.lg,
  },
  text: { fontSize: fontSizes.sm, color: colors.primary },
});
