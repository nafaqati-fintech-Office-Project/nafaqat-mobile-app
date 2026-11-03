import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SegmentedTabs, type SegmentedOption } from '@/components/SegmentedTabs';
import { showToast } from '@/components/Toast';
import { AUTH_BYPASS } from '@/config/flags';
import { PlanComparison } from '@/features/plans/PlanComparison';
import { FEATURES, isPlanFeature, monthsFreeYearly, premiumPrice, type Billing } from '@/features/plans/plans';
import { usePlan } from '@/features/plans/usePlan';
import { getUserPreferences } from '@/features/profile/profileApi';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, shadows, sizes, spacing } from '@/theme';
import { formatMoney } from '@/utils/money';

const BILLING: SegmentedOption<Billing>[] = [
  { value: 'monthly', label: 'plans.monthly' },
  { value: 'yearly', label: 'plans.yearly' },
];

// Opened from the More tab, or with ?feature=<PlanFeature> when a free user taps a Premium feature.
export default function PlansRoute() {
  const { t, language, isRTL } = useLanguage();
  const params = useLocalSearchParams<{ feature?: string }>();
  const locked = isPlanFeature(params.feature) ? params.feature : null;
  const lockedLabel = FEATURES.find((row) => row.feature === locked)?.label;
  const { plan, setPlan } = usePlan();
  const [billing, setBilling] = useState<Billing>('yearly');
  const [currency, setCurrency] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Prices follow the currency the user picked in their preferences; bypass mode has no session.
  useEffect(() => {
    if (AUTH_BYPASS) return;
    let active = true;
    getUserPreferences()
      .then((preferences) => {
        if (active) setCurrency(preferences?.currency ?? null);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const price = premiumPrice(currency);
  const saved = monthsFreeYearly(price);
  const amount = formatMoney(price[billing], price.currency, language);
  const isPremium = plan === 'premium';

  // No payment flow yet. In bypass mode upgrading switches the mock plan so the paid features can be tried.
  const upgrade = async () => {
    if (!AUTH_BYPASS) {
      Alert.alert(t('plans.comingSoonTitle'), t('plans.comingSoonBody'));
      return;
    }
    setBusy(true);
    await setPlan('premium');
    setBusy(false);
    showToast(t('plans.upgraded'));
    if (locked && router.canGoBack()) router.back();
  };

  const downgrade = async () => {
    await setPlan('free');
    showToast(t('plans.downgraded'));
  };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/more'))}
          accessibilityRole="button"
          accessibilityLabel={t('budget.back')}
          style={styles.side}>
          {/* The chevron points right; flip it to point back in left-to-right layouts. */}
          <View style={!isRTL && styles.flip}>
            <Icon name="chevron" color={colors.textPrimary} size={sizes.iconLg} />
          </View>
        </Pressable>
        <View style={styles.titles}>
          <AppText weight="bold" style={styles.title} accessibilityRole="header">
            {t('plans.title')}
          </AppText>
          <AppText style={styles.subtitle}>{t('plans.subtitle')}</AppText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {lockedLabel && !isPremium && (
          <View style={styles.lockedNote}>
            <Icon name="star" color={colors.violet} size={sizes.icon} />
            <AppText style={styles.lockedText}>{t('plans.lockedNote', { feature: t(lockedLabel) })}</AppText>
          </View>
        )}

        <View style={[styles.current, isPremium && styles.currentPremium]}>
          <AppText style={[styles.currentLabel, isPremium && styles.onDark]}>{t('plans.current')}</AppText>
          <AppText weight="bold" style={[styles.currentPlan, isPremium && styles.onDark]}>
            {plan === null ? ' ' : t(isPremium ? 'plans.premium' : 'plans.free')}
          </AppText>
          <AppText style={[styles.currentBody, isPremium && styles.onDarkMuted]}>
            {t(isPremium ? 'plans.premiumBody' : 'plans.freeBody')}
          </AppText>
        </View>

        <PlanComparison highlight={locked} />

        {plan === 'free' && (
          <View style={styles.offer}>
            <SegmentedTabs options={BILLING} value={billing} onChange={setBilling} />
            <View style={styles.priceRow}>
              <AppText weight="bold" style={styles.price}>
                {amount}
              </AppText>
              <AppText style={styles.per}>{t(billing === 'monthly' ? 'plans.perMonth' : 'plans.perYear')}</AppText>
            </View>
            {billing === 'yearly' && saved > 0 && (
              <AppText weight="medium" style={styles.save}>
                {t('plans.yearlySave', { months: String(saved) })}
              </AppText>
            )}
            <PrimaryButton label={t('plans.upgrade')} onPress={() => void upgrade()} loading={busy} />
            <AppText style={styles.note}>{t(AUTH_BYPASS ? 'plans.demoNote' : 'plans.paymentNote')}</AppText>
          </View>
        )}

        {isPremium && AUTH_BYPASS && (
          <Pressable
            onPress={() => void downgrade()}
            accessibilityRole="button"
            accessibilityLabel={t('plans.switchToFree')}
            style={styles.link}>
            <AppText weight="medium" style={styles.linkText}>
              {t('plans.switchToFree')}
            </AppText>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgLight },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg },
  side: { width: sizes.touchMin, height: sizes.touchMin, alignItems: 'center', justifyContent: 'center' },
  flip: { transform: [{ scaleX: -1 }] },
  titles: { flex: 1 },
  title: { fontSize: fontSizes.lg, color: colors.textPrimary },
  subtitle: { fontSize: fontSizes.xs, color: colors.textSecondary },
  content: { padding: spacing.xl, paddingTop: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxl },
  lockedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.violetSoft,
  },
  lockedText: { flex: 1, fontSize: fontSizes.sm, color: colors.textPrimary },
  current: { gap: spacing.xs, padding: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.white, ...shadows.card },
  currentPremium: { backgroundColor: colors.indigo800 },
  currentLabel: { fontSize: fontSizes.xs, color: colors.textSecondary },
  currentPlan: { fontSize: fontSizes.xl, color: colors.textPrimary },
  currentBody: { fontSize: fontSizes.sm, color: colors.textSecondary },
  onDark: { color: colors.white },
  onDarkMuted: { color: colors.textOnDarkMuted },
  offer: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.white, ...shadows.card },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: spacing.xs },
  price: { fontSize: fontSizes.xl, color: colors.textPrimary },
  per: { fontSize: fontSizes.sm, color: colors.textSecondary },
  save: { fontSize: fontSizes.sm, color: colors.success, textAlign: 'center' },
  note: { fontSize: fontSizes.xs, color: colors.textSecondary, textAlign: 'center' },
  link: { minHeight: sizes.touchMin, alignItems: 'center', justifyContent: 'center' },
  linkText: { fontSize: fontSizes.sm, color: colors.primary },
});
