import { Link } from 'expo-router';
import { useRef } from 'react';
import { StyleSheet, View, type TextInputInstance } from 'react-native';

import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { AuthInput } from '@/features/auth/AuthInput';
import { AuthScreen } from '@/features/auth/AuthScreen';
import { useRegister } from '@/features/auth/useRegister';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, spacing } from '@/theme';

export default function RegisterRoute() {
  const { t } = useLanguage();
  const form = useRegister();
  const lastNameRef = useRef<TextInputInstance>(null);
  const usernameRef = useRef<TextInputInstance>(null);
  const emailRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);
  const confirmRef = useRef<TextInputInstance>(null);

  return (
    <AuthScreen title={t('register.title')} subtitle={t('register.subtitle')}>
      <View style={styles.form}>
        <AuthInput
          label={t('register.firstName')}
          placeholder={t('register.firstNamePlaceholder')}
          value={form.values.firstName}
          onChangeText={form.setField('firstName')}
          error={form.fieldErrors.firstName}
          autoComplete="given-name"
          textContentType="givenName"
          returnKeyType="next"
          onSubmitEditing={() => lastNameRef.current?.focus()}
        />
        <AuthInput
          ref={lastNameRef}
          label={t('register.lastName')}
          placeholder={t('register.lastNamePlaceholder')}
          value={form.values.lastName}
          onChangeText={form.setField('lastName')}
          error={form.fieldErrors.lastName}
          autoComplete="family-name"
          textContentType="familyName"
          returnKeyType="next"
          onSubmitEditing={() => usernameRef.current?.focus()}
        />
        <AuthInput
          ref={usernameRef}
          label={t('register.username')}
          placeholder={t('register.usernamePlaceholder')}
          value={form.values.username}
          onChangeText={form.setField('username')}
          error={form.fieldErrors.username}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username-new"
          textContentType="username"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
        <AuthInput
          ref={emailRef}
          label={t('register.email')}
          placeholder={t('register.emailPlaceholder')}
          value={form.values.email}
          onChangeText={form.setField('email')}
          error={form.fieldErrors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <AuthInput
          ref={passwordRef}
          label={t('register.password')}
          placeholder={t('register.passwordPlaceholder')}
          value={form.values.password}
          onChangeText={form.setField('password')}
          error={form.fieldErrors.password}
          secure
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
        />
        <AuthInput
          ref={confirmRef}
          label={t('register.confirmPassword')}
          placeholder={t('register.confirmPasswordPlaceholder')}
          value={form.values.confirmPassword}
          onChangeText={form.setField('confirmPassword')}
          error={form.fieldErrors.confirmPassword}
          secure
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={form.submit}
        />
      </View>

      {form.banner && (
        <View style={styles.banner} accessibilityLiveRegion="polite">
          <AppText weight="medium" style={styles.bannerText}>
            {form.banner}
          </AppText>
        </View>
      )}
      <PrimaryButton label={t('register.submit')} onPress={form.submit} loading={form.submitting} />

      <View style={styles.divider} />
      <View style={styles.footer}>
        <AppText style={styles.muted}>{t('register.haveAccount')}</AppText>
        <Link href="/login" accessibilityRole="link" style={styles.link}>
          {t('register.signIn')}
        </Link>
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
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
