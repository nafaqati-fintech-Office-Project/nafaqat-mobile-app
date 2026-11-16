import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { Icon } from './Icon';
import { PrimaryButton } from './PrimaryButton';
import { FEATURES, type PlanFeature } from '@/features/plans/plans';
import type { TranslationKey } from '@/i18n';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, shadows, spacing } from '@/theme';

type Prompt = { feature: PlanFeature; body?: TranslationKey };

let show: ((prompt: Prompt) => void) | null = null;

// What a Free user gets when they tap something that is part of Premium: a short message (same look as the web's
// upgrade box) and a "See plans" button that opens the plans screen with the feature highlighted. `body` replaces the
// default "<feature> is part of Premium." with a more specific sentence.
export const showUpgradePrompt = (feature: PlanFeature, body?: TranslationKey) => show?.({ feature, body });

export function UpgradePromptHost() {
  const { t } = useLanguage();
  const [prompt, setPrompt] = useState<Prompt | null>(null);

  useEffect(() => {
    show = setPrompt;
    return () => {
      show = null;
    };
  }, []);

  const close = () => setPrompt(null);
  const seePlans = () => {
    if (!prompt) return;
    const { feature } = prompt;
    close();
    router.push({ pathname: '/plans', params: { feature } });
  };

  const label = prompt ? FEATURES.find((row) => row.feature === prompt.feature)?.label : undefined;
  const body = prompt?.body ? t(prompt.body) : label ? t('plans.lockedNote', { feature: t(label) }) : '';

  return (
    <Modal visible={prompt !== null} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel={t('plans.notNow')} />
        <LinearGradient colors={[colors.navy900, colors.indigo800]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
          <View style={styles.crown}>
            <Icon name="crown" size={28} color={colors.gold} />
          </View>
          <AppText weight="bold" style={styles.title}>
            {t('plans.premiumFeature')}
          </AppText>
          <AppText style={styles.body}>{body}</AppText>
          <View style={styles.actions}>
            <PrimaryButton label={t('plans.seePlans')} onPress={seePlans} />
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
});
