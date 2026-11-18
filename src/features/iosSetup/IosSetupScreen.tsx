import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { loadSetupConfig, resolveFlow } from './config';
import { clearRetest } from '@/features/iosCapture/status';
import { ConnectionCheck } from './ConnectionCheck';
import { RealSetup } from './RealSetup';
import { SimPractice } from './SimPractice';
import { getConsent, markSetupDone, setConsent } from './storage';
import { trackSetup } from './tracking';
import type { FlowId } from './types';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, gradients, lineHeights, radius, sizes, spacing } from '@/theme';

type Stage =
  | { kind: 'loading' }
  | { kind: 'intro' }
  | { kind: 'practice'; flow: FlowId }
  | { kind: 'real'; flow: FlowId }
  | { kind: 'back'; flow: FlowId }
  | { kind: 'done'; flow: FlowId; connected: boolean };

const iosMajor = () => (Platform.OS === 'ios' ? Number.parseInt(String(Platform.Version), 10) || 17 : 17);

const leave = () => (router.canGoBack() ? router.back() : router.replace('/home'));

export function IosSetupScreen() {
  const { t, language } = useLanguage();
  const [stage, setStage] = useState<Stage>({ kind: 'loading' });
  const config = useMemo(() => loadSetupConfig(), []);

  useEffect(() => {
    // The consent screen is shown once; replaying from Settings goes straight to the practice.
    getConsent().then((given) => setStage(given ? { kind: 'practice', flow: 'bank' } : { kind: 'intro' }));
  }, []);

  const flowOf = useCallback(
    (id: FlowId) => resolveFlow(config, id, { iosMajor: iosMajor(), language }),
    [config, language],
  );

  const start = async () => {
    await setConsent();
    setStage({ kind: 'practice', flow: 'bank' });
  };

  const confirmDone = (flow: FlowId, connected: boolean) => {
    trackSetup('setup_confirmed', { flow });
    void markSetupDone(flow);
    void clearRetest();
    setStage({ kind: 'done', flow, connected });
  };

  const preview = Platform.OS !== 'ios';

  let content: React.ReactNode = null;
  if (stage.kind === 'intro') {
    content = (
      <ScrollView contentContainerStyle={styles.centerBody}>
        <View style={styles.iconWrap}>
          <Icon name="sms" color={colors.primary} size={sizes.logoMini * 2} />
        </View>
        <AppText weight="bold" style={styles.title}>
          {t('iosSetup.title')}
        </AppText>
        <AppText style={styles.text}>{t('iosSetup.intro.body')}</AppText>
        <View style={styles.infoCard}>
          <AppText weight="semibold" style={styles.infoTitle}>
            {t('iosSetup.intro.receiveTitle')}
          </AppText>
          <AppText style={styles.infoText}>{t('iosSetup.intro.receive')}</AppText>
          <AppText weight="semibold" style={styles.infoTitle}>
            {t('iosSetup.intro.notReceiveTitle')}
          </AppText>
          <AppText style={styles.infoText}>{t('iosSetup.intro.notReceive')}</AppText>
        </View>
        <AppText style={styles.consent}>{t('iosSetup.intro.consent')}</AppText>
        <PrimaryButton label={t('iosSetup.start')} onPress={start} />
        <Pressable onPress={leave} accessibilityRole="button" accessibilityLabel={t('iosSetup.skip')} style={styles.link}>
          <AppText weight="semibold" style={styles.linkText}>
            {t('iosSetup.skip')}
          </AppText>
        </Pressable>
      </ScrollView>
    );
  } else if (stage.kind === 'practice') {
    content = (
      <SimPractice
        key={`${stage.flow}-${language}`}
        flow={flowOf(stage.flow)}
        previewNotice={preview}
        onComplete={() => setStage({ kind: 'real', flow: stage.flow })}
        onExit={leave}
      />
    );
  } else if (stage.kind === 'real') {
    const flow = flowOf(stage.flow);
    content = (
      <RealSetup
        key={stage.flow}
        flow={flow}
        onReturned={() => setStage({ kind: 'back', flow: stage.flow })}
        onPracticeAgain={() => setStage({ kind: 'practice', flow: stage.flow })}
      />
    );
  } else if (stage.kind === 'back') {
    content = (
      <ConnectionCheck
        key={stage.flow}
        flow={stage.flow}
        onFinished={(connected) => confirmDone(stage.flow, connected)}
        onPracticeAgain={() => setStage({ kind: 'practice', flow: stage.flow })}
      />
    );
  } else if (stage.kind === 'done') {
    content = (
      <View style={styles.centerBody}>
        <View style={styles.iconWrap}>
          <Icon name="check" color={colors.success} size={sizes.logoMini * 2} />
        </View>
        <AppText weight="bold" style={styles.title}>
          {t('iosSetup.done.title')}
        </AppText>
        <AppText style={styles.text}>{t(stage.connected ? 'iosSetup.done.bodyConnected' : 'iosSetup.done.body')}</AppText>
        {stage.flow !== 'wallet' && (
          <>
            <PrimaryButton label={t('iosSetup.done.wallet')} onPress={() => setStage({ kind: 'practice', flow: 'wallet' })} />
            {stage.flow === 'bank' && (
              <Pressable
                onPress={() => setStage({ kind: 'practice', flow: 'bank-extra' })}
                accessibilityRole="button"
                accessibilityLabel={t('iosSetup.done.another')}
                style={styles.link}>
                <AppText weight="semibold" style={styles.linkText}>
                  {t('iosSetup.done.another')}
                </AppText>
              </Pressable>
            )}
          </>
        )}
        <Pressable onPress={leave} accessibilityRole="button" accessibilityLabel={t('iosSetup.done.finish')} style={styles.link}>
          <AppText weight="semibold" style={styles.linkText}>
            {t('iosSetup.done.finish')}
          </AppText>
        </Pressable>
      </View>
    );
  }

  return (
    <LinearGradient colors={gradients.onboarding} style={styles.fill}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.fill}>{content}</SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  centerBody: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg, padding: spacing.xl },
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
  infoCard: {
    alignSelf: 'stretch',
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: { fontSize: fontSizes.sm, color: colors.textPrimary },
  infoText: { fontSize: fontSizes.sm, lineHeight: lineHeights.sm, color: colors.textSecondary, marginBottom: spacing.sm },
  consent: { fontSize: fontSizes.xs, color: colors.textSecondary, textAlign: 'center' },
  link: { minHeight: sizes.touchMin, alignItems: 'center', justifyContent: 'center' },
  linkText: { fontSize: fontSizes.md, color: colors.primary },
});
