import { FlatList, StyleSheet, View } from 'react-native';

import type { ProcessedSms } from './processSms';
import { AppText } from '@/components/AppText';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, spacing } from '@/theme';
import { formatMoney } from '@/utils/money';

export type ParseResults = { items: ProcessedSms[]; skipped: number };

function sourceCounts(items: ProcessedSms[]): string {
  const counts = { lookup: 0, model: 0, llm: 0, fallback: 0, rule: 0, user: 0 };
  items.forEach(({ source }) => (counts[source] += 1));
  return `lookup ${counts.lookup} · model ${counts.model} · gemini ${counts.llm} · fallback ${counts.fallback} · own rule ${counts.rule + counts.user}`;
}

const categoryLine = ({ category, source, confidence }: ProcessedSms) =>
  [category, source, confidence !== undefined && confidence.toFixed(2)].filter(Boolean).join(' · ');

export function SmsParseResults({ results }: { results: ParseResults }) {
  const { t, language } = useLanguage();

  return (
    <FlatList
      data={results.items}
      keyExtractor={(item) => item.txn.smsId}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <AppText weight="medium" style={styles.count}>
          {`${t('sms.debug.parsed')} ${results.items.length} · ${t('sms.debug.skipped')} ${results.skipped}\n${sourceCounts(results.items)}`}
        </AppText>
      }
      renderItem={({ item }) => (
        <View style={styles.item}>
          <AppText weight="semibold" style={styles.title}>
            {`${item.txn.type} ${formatMoney(item.txn.amount, item.txn.currency, language)}`}
          </AppText>
          <AppText style={styles.meta}>
            {[item.txn.bank, item.txn.merchant, item.txn.cardLast4 && `•••• ${item.txn.cardLast4}`]
              .filter(Boolean)
              .join(' · ')}
          </AppText>
          <AppText weight="medium" style={styles.category}>
            {categoryLine(item)}
          </AppText>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  count: { fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: spacing.sm },
  item: { gap: spacing.xs, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.white },
  title: { fontSize: fontSizes.sm, color: colors.textPrimary },
  category: { fontSize: fontSizes.sm, color: colors.primary },
  meta: { fontSize: fontSizes.xs, color: colors.textSecondary },
});
