import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { AuthInput } from '@/features/auth/AuthInput';
import { AuthScreen } from '@/features/auth/AuthScreen';
import { useForgotPassword } from '@/features/auth/useForgotPassword';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, spacing } from '@/theme';

export default function ForgotPasswordRoute() {
  const { t } = useLanguage();
  const form = useForgotPassword();

  return (
    <AuthScreen title={t('forgot.title')} subtitle={t('forgot.subtitle')}>
      {form.sent ? (
        <View style={styles.notice} accessibilityLiveRegion="polite">
          <AppText weight="medium" style={styles.noticeText}>
            {t('forgot.sent')}
          </AppText>
        </View>
      ) : (
        <>
          <AuthInput
            label={t('forgot.email')}
            placeholder={t('forgot.emailPlaceholder')}
            value={form.email}
            onChangeText={form.setEmail}
            error={form.emailError}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="done"
            onSubmitEditing={form.submit}
          />
          {form.banner && (
            <View style={styles.banner} accessibilityLiveRegion="polite">
              <AppText weight="medium" style={styles.bannerText}>
                {form.banner}
              </AppText>
            </View>
          )}
          <PrimaryButton label={t('forgot.submit')} onPress={form.submit} loading={form.submitting} />
        </>
      )}
      <View style={styles.footer}>
        <Link href="/login" accessibilityRole="link" style={styles.link}>
          {t('forgot.backToLogin')}
        </Link>
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  link: { fontSize: fontSizes.sm, color: colors.primary },
  notice: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noticeText: { fontSize: fontSizes.sm, color: colors.textPrimary, textAlign: 'center' },
  banner: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  bannerText: { fontSize: fontSizes.sm, color: colors.danger, textAlign: 'center' },
  footer: { alignItems: 'center' },
});
