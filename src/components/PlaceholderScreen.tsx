import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import type { TranslationKey } from '@/i18n';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, spacing } from '@/theme';

export function PlaceholderScreen({ titleKey }: { titleKey?: TranslationKey }) {
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {titleKey && (
        <AppText weight="bold" style={styles.title}>
          {t(titleKey)}
        </AppText>
      )}
      <AppText weight="medium" style={styles.text}>
        {t('placeholder.comingLater')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgLight,
  },
  title: { fontSize: fontSizes.lg, color: colors.textPrimary },
  text: { fontSize: fontSizes.md, color: colors.textPrimary },
});
