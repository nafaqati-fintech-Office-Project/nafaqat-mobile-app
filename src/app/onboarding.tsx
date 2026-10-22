import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { PaginationDots } from '@/components/PaginationDots';
import { PhoneMockup } from '@/components/PhoneMockup';
import { PrimaryButton } from '@/components/PrimaryButton';
import { slides } from '@/features/onboarding/slides';
import { useExitOnBack } from '@/hooks/useExitOnBack';
import { useOnboarding } from '@/features/onboarding/useOnboarding';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, gradients, lineHeights, sizes, spacing } from '@/theme';

export default function OnboardingRoute() {
  const { t, chosen, isRTL } = useLanguage();
  const { listRef, width, index, isLast, finishing, onScrollEnd, skip, finish } = useOnboarding();

  useExitOnBack();

  return (
    <LinearGradient colors={gradients.onboarding} style={styles.fill}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.fill}>
        <View style={styles.header}>
          {!isLast && (
            <Pressable
              onPress={skip}
              hitSlop={spacing.sm}
              accessibilityRole="button"
              accessibilityLabel={t('onboarding.skipA11y')}
              style={styles.skip}>
              <AppText weight="semibold" style={styles.skipText}>
                {t('onboarding.skip')}
              </AppText>
            </Pressable>
          )}
        </View>
        <FlatList
          ref={listRef}
          data={slides}
          keyExtractor={(item) => item.key}
          horizontal
          pagingEnabled
          style={styles.pager}
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width, direction: isRTL ? 'rtl' : 'ltr' }]}>
              <AppText weight="bold" style={styles.title}>
                {t(item.titleKey)}
              </AppText>
              <AppText style={styles.subtitle}>{t(item.subtitleKey)}</AppText>
              <PhoneMockup highlighted={item.highlighted} />
            </View>
          )}
        />
        <View style={styles.footer}>
          <PaginationDots count={slides.length} activeIndex={index} />
          <PrimaryButton
            label={t('onboarding.getStarted')}
            accessibilityLabel={t('onboarding.getStartedA11y')}
            onPress={() => finish('getStarted', '/language')}
            loading={finishing === 'getStarted'}
            disabled={finishing !== null}
            showArrow
          />
          <View style={styles.signInRow}>
            <AppText style={styles.muted}>{t('onboarding.haveAccount')}</AppText>
            <Pressable
              onPress={() => finish('signIn', chosen ? '/login' : '/language')}
              disabled={finishing !== null}
              accessibilityRole="button"
              accessibilityLabel={t('onboarding.signInA11y')}
              style={styles.signIn}>
              <AppText weight="semibold" style={styles.link}>
                {t('onboarding.signIn')}
              </AppText>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // Paging offsets stay left-to-right in both languages; slide content follows the language.
  pager: { direction: 'ltr' },
  header: {
    minHeight: sizes.touchMin,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
  },
  skip: {
    minWidth: sizes.touchMin,
    minHeight: sizes.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: { fontSize: fontSizes.sm, color: colors.primary },
  slide: { flex: 1, paddingHorizontal: spacing.xl, gap: spacing.sm },
  title: {
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.xl,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  footer: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, gap: spacing.lg },
  signInRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  signIn: { minHeight: sizes.touchMin, justifyContent: 'center', paddingHorizontal: spacing.xs },
  muted: { fontSize: fontSizes.sm, color: colors.textSecondary },
  link: { fontSize: fontSizes.sm, color: colors.primary },
});
