import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { parseSms } from './parser/parseSms';
import { processSms, type ProcessedSms } from './processSms';
import { SmsListenerPanel } from './SmsListenerPanel';
import { SmsParseResults, type ParseResults } from './SmsParseResults';
import { readInbox, type SmsMessage } from './smsReader';
import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, spacing } from '@/theme';
import { intlLocale } from '@/utils/intl';

const LIMIT = 50;
const PREVIEW_LINES = 2;

type Busy = 'read' | 'parse' | 'categorize' | null;

function parseAll(messages: SmsMessage[]): ParseResults {
  const results: ParseResults = { parsed: [], skipped: [] };
  for (const sms of messages) {
    const txn = parseSms(sms);
    if (txn) results.parsed.push(txn);
    else results.skipped.push(sms);
  }
  return results;
}

async function processAll(messages: SmsMessage[]): Promise<ParseResults> {
  const processed = await Promise.all(messages.map(processSms));
  const results: ParseResults = { parsed: [], skipped: [] };
  const categories: Record<string, ProcessedSms> = {};
  processed.forEach((item, i) => {
    if (!item) {
      results.skipped.push(messages[i]);
      return;
    }
    results.parsed.push(item.txn);
    categories[item.txn.smsId] = item;
  });
  return { ...results, categories };
}

export function SmsDebugScreen() {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<SmsMessage[] | null>(null);
  const [results, setResults] = useState<ParseResults | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);

  const run = async (kind: Exclude<Busy, null>) => {
    setBusy(kind);
    setFailed(false);
    try {
      const result = await readInbox({ limit: LIMIT });
      if (kind === 'read') {
        setMessages(result);
        setResults(null);
        if (__DEV__) console.log(`[sms] read ${result.length} messages`);
      } else {
        const parsed = kind === 'categorize' ? await processAll(result) : parseAll(result);
        setResults(parsed);
        setMessages(null);
        if (__DEV__) console.log(`[sms] parsed ${parsed.parsed.length}, skipped ${parsed.skipped.length}`);
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  };

  const formatDate = (ms: number) =>
    new Intl.DateTimeFormat(intlLocale(language), { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(ms),
    );

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <AppText weight="bold" style={styles.title}>
        {t('sms.debug.title')}
      </AppText>
      <SmsListenerPanel />
      <PrimaryButton label={t('sms.debug.read')} onPress={() => run('read')} loading={busy === 'read'} />
      <PrimaryButton label={t('sms.debug.parse')} onPress={() => run('parse')} loading={busy === 'parse'} />
      <PrimaryButton
        label={t('sms.debug.categorize')}
        onPress={() => run('categorize')}
        loading={busy === 'categorize'}
      />
      {failed && <AppText style={styles.error}>{t('sms.debug.error')}</AppText>}
      {results && <SmsParseResults results={results} />}
      {messages && (
        <>
          <AppText weight="medium" style={styles.count}>
            {`${t('sms.debug.count')} ${messages.length}`}
          </AppText>
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<AppText style={styles.count}>{t('sms.debug.empty')}</AppText>}
            renderItem={({ item }) => (
              <View style={styles.item}>
                <AppText weight="semibold" style={styles.address}>
                  {item.address}
                </AppText>
                <AppText style={styles.preview} numberOfLines={PREVIEW_LINES}>
                  {item.body}
                </AppText>
                <AppText style={styles.date}>{formatDate(item.date)}</AppText>
              </View>
            )}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: spacing.xl, gap: spacing.md, backgroundColor: colors.bgLight },
  title: { fontSize: fontSizes.xl, color: colors.textPrimary },
  error: { fontSize: fontSizes.sm, color: colors.danger },
  count: { fontSize: fontSizes.sm, color: colors.textSecondary },
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  item: { gap: spacing.xs, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.white },
  address: { fontSize: fontSizes.sm, color: colors.textPrimary },
  preview: { fontSize: fontSizes.sm, color: colors.textSecondary },
  date: { fontSize: fontSizes.xs, color: colors.textSecondary },
});
