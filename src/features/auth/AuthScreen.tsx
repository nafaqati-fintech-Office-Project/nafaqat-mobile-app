import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Logo } from '@/components/Logo';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, gradients, lineHeights, sizes, spacing } from '@/theme';

type Props = { title: string; subtitle: string; children: ReactNode };

// Same look as the login screen: gradient, brand block, heading, then the form.
export function AuthScreen({ title, subtitle, children }: Props) {
  const { t } = useLanguage();

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
                {title}
              </AppText>
              <AppText style={styles.subtitle}>{subtitle}</AppText>
            </View>
            {children}
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
  subtitle: { fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center' },
});
