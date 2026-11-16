import { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';

import { back, confirm, currentStep, filledText, progress, startSession, tap } from './engine';
import { SimScreenView } from './SimScreenView';
import { trackSetup } from './tracking';
import type { ResolvedFlow } from './types';
import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, lineHeights, radius, sizes, spacing } from '@/theme';

type Props = {
  flow: ResolvedFlow;
  onComplete: () => void;
  /** Skip or leave: the funnel records the step the user was on. */
  onExit: () => void;
  previewNotice: boolean;
};

export function SimPractice({ flow, onComplete, onExit, previewNotice }: Props) {
  const { t } = useLanguage();
  const [state, setState] = useState(startSession);
  const [hint, setHint] = useState('');

  useEffect(() => {
    trackSetup('sim_started', { flow: flow.id });
  }, [flow.id]);

  const step = currentStep(flow, state);
  const { current, total } = progress(flow, state);

  const apply = (result: ReturnType<typeof tap>) => {
    setState(result.state);
    if (result.outcome.kind === 'wrong') {
      setHint(result.outcome.hint);
      if (result.outcome.hint) AccessibilityInfo.announceForAccessibility(result.outcome.hint);
      return;
    }
    setHint('');
    if (result.outcome.kind === 'advanced' || result.outcome.kind === 'completed') {
      trackSetup('sim_step_completed', { flow: flow.id, step: step.id, number: step.number });
    }
    if (result.outcome.kind === 'completed') {
      trackSetup('sim_completed', { flow: flow.id });
      onComplete();
    }
  };

  const onTap = (elementId: string) => apply(tap(flow, state, elementId));
  const onContinue = () => apply(confirm(flow, state));
  const onBack = () => {
    setHint('');
    setState(back(state));
  };
  const leave = () => {
    trackSetup('sim_abandoned', { flow: flow.id, step: step.id, number: step.number });
    onExit();
  };

  const fillShown = state.filled && step.fill ? { elementId: step.fill.elementId, text: filledText(flow, state, step.fill.elementId) ?? '' } : null;
  const message = hint || (state.filled ? (step.afterFill ?? '') : step.instruction);

  return (
    <View style={styles.fill}>
      <View style={styles.top}>
        <View style={styles.progressRow}>
          <AppText weight="semibold" style={styles.progressText} accessibilityLiveRegion="polite">
            {t('iosSetup.stepOf', { current: String(current), total: String(total) })}
          </AppText>
          <Pressable onPress={leave} accessibilityRole="button" accessibilityLabel={t('iosSetup.skip')} style={styles.skip}>
            <AppText weight="medium" style={styles.skipText}>
              {t('iosSetup.skip')}
            </AppText>
          </Pressable>
        </View>
        <View
          style={styles.bar}
          accessible
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: total, now: current }}>
          <View style={[styles.barFill, { width: `${(current / total) * 100}%` }]} />
        </View>
        {previewNotice && <AppText style={styles.preview}>{t('iosSetup.preview')}</AppText>}
        <View style={[styles.coach, hint ? styles.coachHint : null]} accessibilityLiveRegion="polite">
          <AppText weight="semibold" style={[styles.coachText, hint ? styles.coachHintText : null]}>
            {message}
          </AppText>
        </View>
      </View>

      <View style={styles.screen}>
        <SimScreenView screen={step.screen} targetId={step.target} fill={fillShown} instruction={step.instruction} onTap={onTap} />
      </View>

      <View style={styles.footer}>
        {state.filled ? (
          <PrimaryButton label={t('iosSetup.continue')} onPress={onContinue} />
        ) : (
          <Pressable
            onPress={onBack}
            disabled={state.index === 0}
            accessibilityRole="button"
            accessibilityLabel={t('iosSetup.back')}
            accessibilityState={{ disabled: state.index === 0 }}
            style={[styles.backButton, state.index === 0 && styles.backDisabled]}>
            <AppText weight="semibold" style={styles.backText}>
              {t('iosSetup.back')}
            </AppText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { gap: spacing.sm, paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressText: { fontSize: fontSizes.sm, color: colors.textSecondary },
  skip: { minHeight: sizes.touchMin, justifyContent: 'center' },
  skipText: { fontSize: fontSizes.sm, color: colors.primary },
  bar: { height: 6, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.primary },
  preview: { fontSize: fontSizes.xs, color: colors.textSecondary },
  coach: {
    minHeight: 64,
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  coachHint: { backgroundColor: colors.orangeSoft },
  coachText: { fontSize: fontSizes.md, lineHeight: lineHeights.md, color: colors.textPrimary },
  coachHintText: { color: colors.textPrimary },
  screen: { flex: 1, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, minHeight: sizes.button },
  backButton: { minHeight: sizes.touchMin, alignItems: 'center', justifyContent: 'center' },
  backDisabled: { opacity: 0.35 },
  backText: { fontSize: fontSizes.md, color: colors.primary },
});
