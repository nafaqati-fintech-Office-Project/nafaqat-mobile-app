import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { trackSetup } from './tracking';
import type { FlowId } from './types';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { captureStatus } from '../../../modules/nafaqati-capture';
import { requestTestSms } from '@/features/iosCapture/testSms';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, lineHeights, radius, sizes, spacing } from '@/theme';

type Props = {
  flow: FlowId;
  /** `connected` is true when the test message arrived; false when the setup is saved and will connect later. */
  onFinished: (connected: boolean) => void;
  onPracticeAgain: () => void;
};

type Phase = 'checking' | 'connected' | 'saved' | 'trouble';

const POLL_MS = 2_000;
const TIMEOUT_MS = 60_000;

// The third stage of the setup: proves the automation works. The backend texts a test message that contains the keyword;
// when the Shortcuts action receives it the app says "Connected". Without a test message (not available, limit reached,
// or the Apple Pay automation, which has nothing to send) the setup is saved and connects on the first real message.
export function ConnectionCheck({ flow, onFinished, onPracticeAgain }: Props) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<Phase>(flow === 'wallet' ? 'saved' : 'checking');
  const [limited, setLimited] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const startedAt = useRef(0);

  useEffect(() => {
    if (flow === 'wallet') return;
    let live = true;
    let timer: ReturnType<typeof setInterval> | undefined;
    startedAt.current = Date.now();

    (async () => {
      const sent = await requestTestSms();
      if (!live) return;
      if (sent !== 'sent') {
        setLimited(sent === 'limit');
        setPhase('saved');
        return;
      }
      trackSetup('test_sent', { flow });
      timer = setInterval(async () => {
        const status = await captureStatus().catch(() => null);
        if (!live) return;
        if (status && Math.max(status.lastTestAt, status.lastBankAt) >= startedAt.current) {
          clearInterval(timer);
          trackSetup('connected', { flow });
          setPhase('connected');
        } else if (Date.now() - startedAt.current >= TIMEOUT_MS) {
          clearInterval(timer);
          trackSetup('test_timeout', { flow });
          setPhase('trouble');
        }
      }, POLL_MS);
    })();

    return () => {
      live = false;
      if (timer) clearInterval(timer);
    };
  }, [flow, attempt]);

  if (phase === 'checking') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
        <AppText weight="bold" style={styles.title}>
          {t('iosSetup.check.title')}
        </AppText>
        <AppText style={styles.text}>{t('iosSetup.check.body')}</AppText>
      </View>
    );
  }

  if (phase === 'connected') {
    return (
      <View style={styles.center}>
        <View style={styles.iconWrap}>
          <Icon name="check" color={colors.success} size={sizes.logoMini * 2} />
        </View>
        <AppText weight="bold" style={styles.title} accessibilityLiveRegion="polite">
          {t('iosSetup.check.connected.title')}
        </AppText>
        <AppText style={styles.text}>{t('iosSetup.check.connected.body')}</AppText>
        <PrimaryButton label={t('iosSetup.continue')} onPress={() => onFinished(true)} />
      </View>
    );
  }

  if (phase === 'saved') {
    return (
      <View style={styles.center}>
        <AppText weight="bold" style={styles.title}>
          {t('iosSetup.done.title')}
        </AppText>
        <AppText style={styles.text}>{t(flow === 'wallet' ? 'iosSetup.check.savedWallet' : 'iosSetup.done.body')}</AppText>
        {limited && <AppText style={styles.hint}>{t('iosSetup.check.limit')}</AppText>}
        <PrimaryButton label={t('iosSetup.continue')} onPress={() => onFinished(false)} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.center}>
      <AppText weight="bold" style={styles.title}>
        {t('iosSetup.check.trouble.title')}
      </AppText>
      <AppText style={styles.text}>{t('iosSetup.check.trouble.body')}</AppText>
      <View style={styles.list}>
        {(['1', '2', '3', '4'] as const).map((n) => (
          <View key={n} style={styles.item}>
            <View style={styles.number}>
              <AppText weight="bold" style={styles.numberText}>
                {n}
              </AppText>
            </View>
            <AppText style={styles.itemText}>{t(`iosSetup.check.trouble.${n}`)}</AppText>
          </View>
        ))}
      </View>
      <PrimaryButton label={t('iosSetup.check.retry')} onPress={() => {
          setPhase('checking');
          setAttempt((a) => a + 1);
        }} />
      <Pressable onPress={onPracticeAgain} accessibilityRole="button" accessibilityLabel={t('iosSetup.real.replay')} style={styles.link}>
        <AppText weight="semibold" style={styles.linkText}>
          {t('iosSetup.real.replay')}
        </AppText>
      </Pressable>
      <Pressable onPress={() => onFinished(false)} accessibilityRole="button" accessibilityLabel={t('iosSetup.skip')} style={styles.link}>
        <AppText weight="semibold" style={styles.linkText}>
          {t('iosSetup.check.later')}
        </AppText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg, padding: spacing.xl },
  iconWrap: {
    width: sizes.logoSplash,
    height: sizes.logoSplash,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: fontSizes.xl, lineHeight: lineHeights.xl, color: colors.textPrimary, textAlign: 'center' },
  text: { fontSize: fontSizes.sm, lineHeight: lineHeights.sm, color: colors.textSecondary, textAlign: 'center' },
  hint: { fontSize: fontSizes.xs, color: colors.textSecondary, textAlign: 'center' },
  list: { alignSelf: 'stretch', gap: spacing.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  number: {
    width: sizes.checkCircle,
    height: sizes.checkCircle,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: { fontSize: fontSizes.xs, color: colors.primary },
  itemText: { flex: 1, fontSize: fontSizes.sm, lineHeight: lineHeights.sm, color: colors.textPrimary },
  link: { minHeight: sizes.touchMin, alignItems: 'center', justifyContent: 'center' },
  linkText: { fontSize: fontSizes.md, color: colors.primary },
});
