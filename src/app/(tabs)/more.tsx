import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';

export default function MoreRoute() {
  const { t, language, isRTL } = useLanguage();
  const { signOut } = useAuth();

  const onSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <StatusBar style="dark" />
      <AppText weight="bold" style={styles.title}>
        {t('tabs.more')}
      </AppText>
      <Pressable
        onPress={() => router.push('/language')}
        accessibilityRole="button"
        accessibilityLabel={t('more.language')}
        style={styles.row}>
        <AppText weight="medium" style={styles.rowLabel}>
          {t('more.language')}
        </AppText>
        <AppText style={styles.rowValue}>{t(`language.${language}.title`)}</AppText>
        <View style={isRTL && styles.flip}>
          <Icon name="chevron" color={colors.textSecondary} size={sizes.icon} />
        </View>
      </Pressable>
      <View style={styles.footer}>
        <PrimaryButton label={t('more.signOut')} onPress={onSignOut} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: spacing.xl, gap: spacing.lg, backgroundColor: colors.bgLight },
  title: { fontSize: fontSizes.xl, color: colors.textPrimary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: sizes.button,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
  },
  rowLabel: { flex: 1, fontSize: fontSizes.md, color: colors.textPrimary },
  rowValue: { fontSize: fontSizes.sm, color: colors.textSecondary },
  flip: { transform: [{ scaleX: -1 }] },
  footer: { marginTop: 'auto' },
});
