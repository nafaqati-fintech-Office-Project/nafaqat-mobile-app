import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { showToast } from '@/components/Toast';
import { AUTH_BYPASS } from '@/config/flags';
import { requestDeletion, signOutEverywhere } from '@/features/account/deletionApi';
import { CONFIRM_WORD, deletionDate, isConfirmed } from '@/features/account/deletionForm';
import { AuthInput } from '@/features/auth/AuthInput';
import type { TranslationKey } from '@/i18n';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';

const LOST: TranslationKey[] = [
  'deleteAccount.lostTransactions',
  'deleteAccount.lostBudgets',
  'deleteAccount.lostReports',
  'deleteAccount.lostFamily',
  'deleteAccount.lostLogin',
];

export default function DeleteAccountRoute() {
  const { t, language, isRTL } = useLanguage();
  const { signOut } = useAuth();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/more'));
  const ready = isConfirmed(typed) && !busy;

  const submit = async () => {
    if (!ready) return;
    if (AUTH_BYPASS) {
      showToast(t('deleteAccount.unavailable'));
      return;
    }
    setBusy(true);
    try {
      const request = await requestDeletion();
      // Other phones and the web app are signed out too; this phone's own session ends just below anyway.
      await signOutEverywhere().catch(() => undefined);
      await signOut();
      router.replace('/login');
      showToast(t('deleteAccount.scheduled', { date: deletionDate(request.purgeAfter, language) }));
    } catch {
      showToast(t('deleteAccount.failed'));
      setBusy(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={t('common.back')} style={styles.back}>
          <View style={!isRTL && styles.flip}>
            <Icon name="chevron" color={colors.textPrimary} size={sizes.iconLg} />
          </View>
        </Pressable>
        <AppText weight="bold" style={styles.title} accessibilityRole="header">
          {t('deleteAccount.title')}
        </AppText>
        <View style={styles.back} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}>
        <View style={styles.warning}>
          <AppText weight="bold" style={styles.warningTitle}>
            {t('deleteAccount.warningTitle')}
          </AppText>
          {LOST.map((key) => (
            <View key={key} style={styles.bullet}>
              <AppText style={styles.dot}>•</AppText>
              <AppText style={styles.bulletText}>{t(key)}</AppText>
            </View>
          ))}
        </View>
        <AppText style={styles.body}>{t('deleteAccount.grace')}</AppText>
        <AppText style={styles.body}>{t('deleteAccount.familyNote')}</AppText>
        <AuthInput
          label={t('deleteAccount.typeToConfirm', { word: CONFIRM_WORD })}
          value={typed}
          onChangeText={setTyped}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          placeholder={CONFIRM_WORD}
          maxLength={20}
        />
      </ScrollView>
      <View style={styles.footer}>
        <Pressable
          onPress={() => void submit()}
          disabled={!ready}
          accessibilityRole="button"
          accessibilityLabel={t('deleteAccount.confirm')}
          accessibilityState={{ disabled: !ready, busy }}
          style={({ pressed }) => [styles.danger, !ready && styles.disabled, pressed && styles.pressed]}>
          {busy ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <AppText weight="semibold" style={styles.dangerText}>
              {t('deleteAccount.confirm')}
            </AppText>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgLight },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg },
  back: { width: sizes.touchMin, height: sizes.touchMin, alignItems: 'center', justifyContent: 'center' },
  flip: { transform: [{ scaleX: -1 }] },
  title: { flex: 1, textAlign: 'center', fontSize: fontSizes.lg, color: colors.textPrimary },
  content: { padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.lg, paddingBottom: spacing.xxl },
  warning: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  warningTitle: { fontSize: fontSizes.md, color: colors.danger },
  bullet: { flexDirection: 'row', gap: spacing.sm },
  dot: { fontSize: fontSizes.sm, color: colors.danger },
  bulletText: { flex: 1, fontSize: fontSizes.sm, color: colors.textPrimary },
  body: { fontSize: fontSizes.sm, color: colors.textSecondary },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
  danger: {
    minHeight: sizes.button,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.danger,
  },
  dangerText: { fontSize: fontSizes.md, color: colors.white },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.8 },
});
