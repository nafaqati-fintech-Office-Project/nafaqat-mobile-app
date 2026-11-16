import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { showToast } from '@/components/Toast';
import { cancelDeletion } from '@/features/account/deletionApi';
import { deletionDate } from '@/features/account/deletionForm';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';

// Shown after signing in to an account that is scheduled for deletion (see usePendingDeletion).
export default function AccountRestoreRoute() {
  const { t, language } = useLanguage();
  const { signOut } = useAuth();
  const { id, purgeAfter } = useLocalSearchParams<{ id: string; purgeAfter: string }>();
  const [busy, setBusy] = useState(false);

  const restore = async () => {
    setBusy(true);
    try {
      await cancelDeletion(id);
      showToast(t('restoreAccount.restored'));
      router.replace('/home');
    } catch {
      showToast(t('restoreAccount.failed'));
      setBusy(false);
    }
  };

  const leave = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <AppText weight="bold" style={styles.title} accessibilityRole="header">
          {t('restoreAccount.title')}
        </AppText>
        <AppText style={styles.body}>
          {t('restoreAccount.body', { date: purgeAfter ? deletionDate(purgeAfter, language) : '' })}
        </AppText>
        <AppText style={styles.body}>{t('restoreAccount.keepsEverything')}</AppText>
      </View>
      <View style={styles.footer}>
        <PrimaryButton label={t('restoreAccount.restore')} onPress={() => void restore()} loading={busy} disabled={!id} />
        <Pressable
          onPress={() => void leave()}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={t('restoreAccount.signOut')}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <AppText weight="semibold" style={styles.secondaryText}>
            {t('restoreAccount.signOut')}
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgLight },
  content: { flex: 1, justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
  title: { fontSize: fontSizes.xl, color: colors.textPrimary, textAlign: 'center' },
  body: { fontSize: fontSizes.md, color: colors.textSecondary, textAlign: 'center' },
  footer: { gap: spacing.md, paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  secondary: {
    minHeight: sizes.button,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  secondaryText: { fontSize: fontSizes.md, color: colors.textPrimary },
  pressed: { opacity: 0.7 },
});
