import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Logo } from '@/components/Logo';
import { PrimaryButton } from '@/components/PrimaryButton';
import { AuthInput } from '@/features/auth/AuthInput';
import { Checkbox } from '@/features/auth/Checkbox';
import { useLogin } from '@/features/auth/useLogin';
import { useExitOnBack } from '@/hooks/useExitOnBack';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, gradients, lineHeights, radius, sizes, spacing } from '@/theme';

export default function LoginRoute() {
  const { t } = useLanguage();
  const form = useLogin();
  const passwordRef = useRef<TextInput>(null);

  useExitOnBack();

  return (
    <LinearGradient colors={gradients.onboarding} style={styles.fill}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.fill}>
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.brand}>
              <Logo size={sizes.logoLogin} accessibilityLabel={t('splash.logoLabel')} />
              <AppText weight="bold" style={styles.appName}>
                {t('appName')}
              </AppText>
            </View>
            <View style={styles.heading}>
              <AppText weight="bold" style={styles.title}>
                {t('login.title')}
              </AppText>
              <AppText style={styles.subtitle}>{t('login.subtitle')}</AppText>
            </View>

            <View style={styles.form}>
              <AuthInput
                label={t('login.identifier')}
                placeholder={t('login.identifierPlaceholder')}
                value={form.identifier}
                onChangeText={form.setIdentifier}
                error={form.fieldErrors.identifier}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                textContentType="username"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
              <AuthInput
                ref={passwordRef}
                label={t('login.password')}
                placeholder={t('login.passwordPlaceholder')}
                value={form.password}
                onChangeText={form.setPassword}
                error={form.fieldErrors.password}
                secure
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={form.submit}
              />
              <View style={styles.optionsRow}>
                <Checkbox
                  label={t('login.remember')}
                  checked={form.rememberMe}
                  onChange={form.setRememberMe}
                />
                <Link href="/forgot-password" accessibilityRole="link" style={styles.link}>
                  {t('login.forgot')}
                </Link>
              </View>
            </View>

            {form.banner && (
              <View style={styles.banner} accessibilityLiveRegion="polite">
                <AppText weight="medium" style={styles.bannerText}>
                  {form.banner}
                </AppText>
              </View>
            )}
            <PrimaryButton
              label={t('login.submit')}
              onPress={form.submit}
              loading={form.submitting}
            />

            <View style={styles.divider} />
            <View style={styles.footer}>
              <AppText style={styles.muted}>{t('login.noAccount')}</AppText>
              <Link href="/register" accessibilityRole="link" style={styles.link}>
                {t('login.signUp')}
              </Link>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.xl, gap: spacing.lg },
  brand: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  appName: { fontSize: fontSizes.lg, lineHeight: lineHeights.lg, color: colors.textPrimary },
  heading: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  title: { fontSize: fontSizes.xl, lineHeight: lineHeights.xl, color: colors.textPrimary },
  subtitle: { fontSize: fontSizes.sm, color: colors.textSecondary },
  form: { gap: spacing.lg },
  optionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { fontSize: fontSizes.sm, color: colors.primary },
  banner: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  bannerText: { fontSize: fontSizes.sm, color: colors.danger, textAlign: 'center' },
  divider: { height: 1, backgroundColor: colors.border, marginTop: spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.xs },
  muted: { fontSize: fontSizes.sm, color: colors.textSecondary },
});
