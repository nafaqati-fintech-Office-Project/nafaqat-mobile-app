import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { Logo } from '@/components/Logo';
import { Skyline } from '@/components/Skyline';
import { useLanguage } from '@/i18n/LanguageProvider';
import { getOnboardingSeen } from '@/storage/flags';
import { colors, fontSizes, gradients, lineHeights, shadows, sizes, spacing } from '@/theme';

const SPLASH_MS = 2000;
// Temporary: show onboarding on every launch.
const ALWAYS_SHOW_ONBOARDING = true;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type Target = '/onboarding' | '/language' | '/home' | '/login';

export default function SplashRoute() {
  const { t, chosen } = useLanguage();
  const { restoreSession } = useAuth();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));

    let active = true;
    const resolveTarget = async (): Promise<Target> => {
      const [seen] = await Promise.all([getOnboardingSeen(), wait(SPLASH_MS)]);
      if (ALWAYS_SHOW_ONBOARDING || !seen) return '/onboarding';
      if (!chosen) return '/language';
      return (await restoreSession()) ? '/home' : '/login';
    };
    resolveTarget().then((target) => {
      if (active) router.replace(target);
    });
    return () => {
      active = false;
    };
  }, [progress, chosen, restoreSession]);

  const brandStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ scale: 0.8 + progress.get() * 0.2 }],
  }));

  return (
    <LinearGradient colors={gradients.splash} style={styles.fill}>
      <StatusBar style="light" />
      <Skyline />
      <SafeAreaView style={styles.fill}>
        <Animated.View style={[styles.brand, brandStyle]}>
          <View style={styles.logo}>
            <Logo size={sizes.logoSplash} accessibilityLabel={t('splash.logoLabel')} />
          </View>
          <AppText weight="bold" style={styles.wordmark}>
            {t('appName')}
          </AppText>
          <AppText weight="medium" style={styles.tagline}>
            {t('splash.tagline')}
          </AppText>
        </Animated.View>
        <View style={styles.footer}>
          <AppText style={styles.poweredBy}>{t('splash.poweredBy')}</AppText>
          <AppText weight="semibold" style={styles.company}>
            {t('splash.company')}
          </AppText>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  brand: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  logo: {
    marginBottom: spacing.sm,
    ...shadows.logo,
  },
  wordmark: {
    fontSize: fontSizes.xxl,
    lineHeight: lineHeights.xxl,
    color: colors.white,
  },
  tagline: {
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    color: colors.textOnDarkMuted,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
    gap: spacing.xxs,
  },
  poweredBy: {
    fontSize: fontSizes.xs,
    color: colors.textOnDarkSubtle,
  },
  company: {
    fontSize: fontSizes.sm,
    color: colors.white,
  },
});
