import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { processSms, type ProcessedSms } from './processSms';
import { SmsListenerPanel } from './SmsListenerPanel';
import { SmsParseResults, type ParseResults } from './SmsParseResults';
import { readInbox } from './smsReader';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';

const LIMIT = 500;
const BATCH_SIZE = 10;

async function parseInbox(): Promise<ParseResults> {
  const messages = await readInbox({ limit: LIMIT });
  const items: ProcessedSms[] = [];
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = await Promise.all(messages.slice(i, i + BATCH_SIZE).map(processSms));
    items.push(...batch.filter((item): item is ProcessedSms => item !== null));
  }
  return { items, skipped: messages.length - items.length };
}

export function SmsDebugScreen() {
  const { t } = useLanguage();
  const [results, setResults] = useState<ParseResults | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const parsed = await parseInbox();
      setResults(parsed);
      if (__DEV__) console.log(`[sms] parsed ${parsed.items.length}, skipped ${parsed.skipped}`);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <AppText weight="bold" style={styles.title}>
          {t('sms.debug.title')}
        </AppText>
        <Pressable
          onPress={run}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={t('sms.debug.parse')}
          style={styles.iconButton}>
          {busy ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Icon name="assistant" color={colors.primary} size={sizes.iconLg} />
          )}
        </Pressable>
      </View>
      <SmsListenerPanel />
      {failed && <AppText style={styles.error}>{t('sms.debug.error')}</AppText>}
      {results && <SmsParseResults results={results} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: spacing.xl, gap: spacing.md, backgroundColor: colors.bgLight },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: fontSizes.xl, color: colors.textPrimary },
  iconButton: {
    width: sizes.bell,
    height: sizes.bell,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { fontSize: fontSizes.sm, color: colors.danger },
});
