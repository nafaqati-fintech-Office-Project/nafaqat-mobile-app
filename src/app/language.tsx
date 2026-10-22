import { getLocales } from 'expo-localization';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { LanguageCard } from '@/features/language/LanguageCard';
import type { Language } from '@/i18n';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, gradients, lineHeights, spacing } from '@/theme';

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
    <LinearGradient colors={gradients.onboarding} style={styles.fill}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.fill}>
        <View style={styles.body}>
          <AppText weight="bold" style={styles.title}>
            {t('language.title')}
          </AppText>
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
        <View style={styles.footer}>
          <PrimaryButton label={t('language.continue')} onPress={onContinue} loading={saving} />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xxxl, gap: spacing.xl },
  title: {
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.xl,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  cards: { gap: spacing.md },
  footer: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
});
