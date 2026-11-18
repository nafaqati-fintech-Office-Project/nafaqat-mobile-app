import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { isAxiosError } from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { Icon } from './Icon';
import { PrimaryButton } from './PrimaryButton';
import { showToast } from './Toast';
import { costOf, getCredits, spendCredits, type CreditFeature, type CreditSummary } from '@/features/credits/creditsApi';
import { ADS_AVAILABLE, watchRewardedAd } from '@/features/credits/rewardedAd';
import type { PlanFeature } from '@/features/plans/plans';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, shadows, spacing } from '@/theme';

type Prompt = { feature: CreditFeature; planFeature: PlanFeature; onUnlocked: () => void };

let show: ((prompt: Prompt) => void) | null = null;

// What a Free user gets when they tap a feature that can be unlocked with credits: spend credits if they have enough,
// watch a rewarded ad to earn more, or go to Premium. `onUnlocked` runs after a successful spend so the caller can carry on
// with what the user was doing (for example start the export).
export const showCreditPrompt = (feature: CreditFeature, planFeature: PlanFeature, onUnlocked: () => void) =>
  show?.({ feature, planFeature, onUnlocked });

export function CreditPromptHost() {
  const { t } = useLanguage();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [summary, setSummary] = useState<CreditSummary | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setSummary(await getCredits());
    } catch {
      setSummary(null);
    }
  }, []);

  useEffect(() => {
    show = (next) => {
      setPrompt(next);
      setSummary(null);
      void load();
    };
    return () => {
      show = null;
    };
  }, [load]);

  const close = () => setPrompt(null);

  if (!prompt) {
    return null;
  }

  const cost = costOf(summary, prompt.feature);
  const balance = summary?.balance ?? 0;
  const enough = summary !== null && cost > 0 && balance >= cost;
  const adsLeft = summary !== null && summary.adsWatchedToday < summary.dailyAdLimit && balance < summary.maxBalance;

  const spend = async () => {
    setBusy(true);
    try {
      await spendCredits(prompt.feature);
      const done = prompt.onUnlocked;
      close();
      done();
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 402) await load();
      else showToast(t('credits.spendFailed'));
    } finally {
      setBusy(false);
    }
  };

  const watch = async () => {
    setBusy(true);
    try {
      if (await watchRewardedAd()) {
        // The ad network tells the server a moment after the ad ends, so look again for a few seconds until the credit lands.
        for (let i = 0; i < 6; i++) {
          const next = await getCredits();
          setSummary(next);
          if (next.balance > balance) break;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      const code = isAxiosError(error) ? (error.response?.data as { code?: string } | undefined)?.code : undefined;
      showToast(t(code === 'DAILY_AD_LIMIT' ? 'credits.dailyLimit' : 'credits.adFailed'));
      await load();
    } finally {
      setBusy(false);
    }
  };

  const goPremium = () => {
    const feature = prompt.planFeature;
    close();
    router.push({ pathname: '/plans', params: { feature } });
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel={t('plans.notNow')} />
        <LinearGradient colors={[colors.navy900, colors.indigo800]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
          <View style={styles.crown}>
            <Icon name="crown" size={28} color={colors.gold} />
          </View>
          <AppText weight="bold" style={styles.title}>
            {t('credits.title')}
          </AppText>
          <AppText style={styles.body}>
            {summary === null ? t('credits.loading') : t('credits.cost', { cost: String(cost), balance: String(balance) })}
          </AppText>
          <View style={styles.actions}>
            {enough ? <PrimaryButton label={t('credits.use', { cost: String(cost) })} onPress={spend} loading={busy} /> : null}
            {!enough && ADS_AVAILABLE && adsLeft ? (
              <PrimaryButton label={t('credits.watchAd', { credits: String(summary?.creditsPerAd ?? 1) })} onPress={watch} loading={busy} />
            ) : null}
            {!enough && summary !== null && !adsLeft ? <AppText style={styles.body}>{t('credits.dailyLimit')}</AppText> : null}
            <Pressable onPress={goPremium} accessibilityRole="button" style={styles.later}>
              <AppText weight="bold" style={styles.premiumText}>
                {t('credits.goPremium')}
              </AppText>
            </Pressable>
            <Pressable onPress={close} accessibilityRole="button" style={styles.later}>
              <AppText weight="medium" style={styles.laterText}>
                {t('plans.notNow')}
              </AppText>
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: 'rgba(6, 11, 43, 0.6)' },
  card: { width: '100%', maxWidth: 380, alignItems: 'center', gap: spacing.md, padding: spacing.xl, borderRadius: radius.lg, ...shadows.card },
  crown: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 28, backgroundColor: 'rgba(251, 191, 36, 0.15)' },
  title: { fontSize: fontSizes.lg, color: colors.white, textAlign: 'center' },
  body: { fontSize: fontSizes.sm, lineHeight: 20, color: colors.textOnDarkMuted, textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.sm },
  later: { alignItems: 'center', paddingVertical: spacing.sm },
  laterText: { fontSize: fontSizes.sm, color: colors.textOnDarkMuted },
  premiumText: { fontSize: fontSizes.sm, color: colors.gold },
});
