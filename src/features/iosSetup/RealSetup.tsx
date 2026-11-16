import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { checklist } from './config';
import { trackSetup } from './tracking';
import type { ResolvedFlow } from './types';
import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, lineHeights, radius, sizes, spacing } from '@/theme';

type Props = {
  flow: ResolvedFlow;
  /** The user came back to Nafaqati after opening Shortcuts. */
  onReturned: () => void;
  onPracticeAgain: () => void;
};

// The things the app can do for the user. It cannot create the automation (Apple only lets the user do that), so it
// copies the keyword, opens Shortcuts, keeps the steps at hand and notices when the user comes back.
export function RealSetup({ flow, onReturned, onPracticeAgain }: Props) {
  const { t } = useLanguage();
  const hasKeyword = flow.id !== 'wallet';
  const [copied, setCopied] = useState(false);
  const [openFailed, setOpenFailed] = useState(false);
  const opened = useRef(false);

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(flow.keyword);
      setCopied(true);
      trackSetup('keyword_copied', { flow: flow.id });
    } catch {
      setCopied(false);
    }
  };

  // The keyword is on the clipboard before the user even leaves Nafaqati.
  useEffect(() => {
    if (!hasKeyword) return;
    let live = true;
    Clipboard.setStringAsync(flow.keyword)
      .then(() => {
        if (!live) return;
        setCopied(true);
        trackSetup('keyword_copied', { flow: flow.id });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [hasKeyword, flow.id, flow.keyword]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && opened.current) {
        opened.current = false;
        trackSetup('returned_from_shortcuts', { flow: flow.id });
        onReturned();
      }
    });
    return () => sub.remove();
  }, [flow.id, onReturned]);

  const openShortcuts = async () => {
    setOpenFailed(false);
    if (hasKeyword) await copy();
    opened.current = true;
    try {
      await Linking.openURL('shortcuts://');
      trackSetup('shortcuts_opened', { flow: flow.id });
    } catch {
      opened.current = false;
      setOpenFailed(true);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <AppText weight="bold" style={styles.title}>
        {t('iosSetup.real.title')}
      </AppText>
      <AppText style={styles.text}>{t(hasKeyword ? 'iosSetup.real.body' : 'iosSetup.real.bodyWallet')}</AppText>

      {hasKeyword && (
        <View style={styles.keywordCard}>
          <AppText style={styles.keywordLabel}>{t('iosSetup.real.keyword')}</AppText>
          <AppText weight="bold" style={styles.keyword} selectable>
            {flow.keyword}
          </AppText>
          <Pressable onPress={copy} accessibilityRole="button" accessibilityLabel={t('iosSetup.real.copy')} style={styles.copyButton}>
            <AppText weight="semibold" style={styles.copyText}>
              {t('iosSetup.real.copy')}
            </AppText>
          </Pressable>
          {copied && (
            <AppText style={styles.copied} accessibilityLiveRegion="polite">
              {t('iosSetup.real.copied', { keyword: flow.keyword })}
            </AppText>
          )}
        </View>
      )}

      <PrimaryButton label={t('iosSetup.real.open')} onPress={openShortcuts} />
      {openFailed && <AppText style={styles.error}>{t('iosSetup.real.openFailed')}</AppText>}

      <AppText weight="semibold" style={styles.listTitle}>
        {t('iosSetup.real.checklist')}
      </AppText>
      <View style={styles.list}>
        {checklist(flow).map((item) => (
          <View key={item.number} style={styles.item}>
            <View style={styles.number}>
              <AppText weight="bold" style={styles.numberText}>
                {item.number}
              </AppText>
            </View>
            <AppText style={styles.itemText}>{item.text}</AppText>
          </View>
        ))}
      </View>

      <Pressable onPress={onPracticeAgain} accessibilityRole="button" accessibilityLabel={t('iosSetup.real.replay')} style={styles.replay}>
        <AppText weight="semibold" style={styles.copyText}>
          {t('iosSetup.real.replay')}
        </AppText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.xl, gap: spacing.lg },
  title: { fontSize: fontSizes.xl, lineHeight: lineHeights.xl, color: colors.textPrimary },
  text: { fontSize: fontSizes.sm, lineHeight: lineHeights.sm, color: colors.textSecondary },
  keywordCard: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  keywordLabel: { fontSize: fontSizes.xs, color: colors.textSecondary },
  keyword: { fontSize: fontSizes.xl, color: colors.primary },
  copyButton: { minHeight: sizes.touchMin, justifyContent: 'center' },
  copyText: { fontSize: fontSizes.sm, color: colors.primary },
  copied: { fontSize: fontSizes.xs, color: colors.success },
  error: { fontSize: fontSizes.sm, color: colors.danger },
  listTitle: { fontSize: fontSizes.md, color: colors.textPrimary },
  list: { gap: spacing.sm },
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
  replay: { minHeight: sizes.touchMin, alignItems: 'center', justifyContent: 'center' },
});
