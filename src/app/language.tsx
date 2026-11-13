import { getLocales } from 'expo-localization';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { Logo } from '@/components/Logo';
import { PrimaryButton } from '@/components/PrimaryButton';
import { LanguageCard } from '@/features/language/LanguageCard';
import type { Language } from '@/i18n';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, gradients, lineHeights, radius, sizes, spacing } from '@/theme';

const OPTIONS: Language[] = ['en', 'ar'];

const deviceLanguage = (): Language => (getLocales()[0]?.languageCode === 'ar' ? 'ar' : 'en');

export default function LanguageRoute() {
  const { t, language, chosen, setLanguage } = useLanguage();
  const { status } = useAuth();
  const [selected, setSelected] = useState<Language>(chosen ? language : deviceLanguage());
  const [saving, setSaving] = useState(false);

  const onContinue = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await setLanguage(selected);
      router.replace(status === 'authenticated' ? '/home' : '/login');
    } catch {
      setSaving(false);
    }
  };

  return (
    <View style={styles.fill}>
      <StatusBar style="light" />
      {/* Brand header: the same dark gradient as the splash screen, with a curved bottom edge. */}
      <LinearGradient colors={gradients.splash} style={styles.hero}>
        <SafeAreaView edges={['top']} style={styles.heroContent}>
          <Logo size={sizes.logoSplash} accessibilityLabel={t('splash.logoLabel')} />
          <AppText weight="bold" style={styles.wordmark}>
            {t('appName')}
          </AppText>
          <AppText weight="medium" style={styles.tagline}>
            {t('splash.tagline')}
          </AppText>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.heading}>
          <AppText weight="bold" style={styles.title}>
            {t('language.title')}
          </AppText>
          {/* Shown in both languages so the choice is clear whichever one the user reads. */}
          <AppText weight="medium" style={styles.titleAlt}>
            {language === 'ar' ? 'Choose Your Language' : 'اختر لغتك'}
          </AppText>
        </View>
        <View style={styles.cards} accessibilityRole="radiogroup">
          {OPTIONS.map((option) => (
            <LanguageCard
              key={option}
              language={option}
              selected={selected === option}
              onPress={() => setSelected(option)}
            />
          ))}
        </View>
      </View>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <PrimaryButton label={t('language.continue')} onPress={onContinue} loading={saving} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bgLight },
  hero: { borderBottomLeftRadius: radius.xl + radius.md, borderBottomRightRadius: radius.xl + radius.md, paddingBottom: spacing.xxl },
  heroContent: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xl },
  wordmark: { fontSize: fontSizes.xl, lineHeight: lineHeights.xl, color: colors.white },
  tagline: { fontSize: fontSizes.sm, color: colors.textOnDarkMuted, textAlign: 'center' },
  body: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, gap: spacing.xl },
  heading: { alignItems: 'center', gap: spacing.xxs },
  title: { fontSize: fontSizes.lg, lineHeight: lineHeights.lg, color: colors.textPrimary, textAlign: 'center' },
  titleAlt: { fontSize: fontSizes.md, color: colors.textSecondary, textAlign: 'center' },
  cards: { gap: spacing.md },
  footer: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
});
