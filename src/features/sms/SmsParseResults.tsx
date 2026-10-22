import { FlatList, StyleSheet, View } from 'react-native';

import type { ParsedTxn } from './parser/types';
import type { SmsMessage } from './smsReader';
import type { Categorized } from '@/features/categorizer/categorize';
import { AppText } from '@/components/AppText';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, spacing } from '@/theme';
import { formatMoney } from '@/utils/money';

export type ParseResults = {
  parsed: ParsedTxn[];
  skipped: SmsMessage[];
  categories?: Record<string, Categorized>;
};

function sourceCounts(categories: Record<string, Categorized>): string {
  const counts = { lookup: 0, model: 0, fallback: 0 };
  Object.values(categories).forEach(({ source }) => (counts[source] += 1));
  return `lookup ${counts.lookup} · model ${counts.model} · fallback ${counts.fallback}`;
}

type Row = { key: string; parsed?: ParsedTxn; skipped?: SmsMessage };

export function SmsParseResults({ results }: { results: ParseResults }) {
  const { t, language } = useLanguage();
  const rows: Row[] = [
    ...results.parsed.map((parsed) => ({ key: `p-${parsed.smsId}`, parsed })),
    ...results.skipped.map((skipped) => ({ key: `s-${skipped.id}`, skipped })),
  ];

  return (
    <FlatList
      data={rows}
      keyExtractor={(row) => row.key}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <AppText weight="medium" style={styles.count}>
          {`${t('sms.debug.parsed')} ${results.parsed.length} · ${t('sms.debug.skipped')} ${results.skipped.length}`}
          {results.categories ? '\n' + sourceCounts(results.categories) : ''}
        </AppText>
      }
      renderItem={({ item }) =>
        item.parsed ? (
          <View style={styles.item}>
            <AppText weight="semibold" style={styles.title}>
              {`${item.parsed.type} ${formatMoney(item.parsed.amount, item.parsed.currency, language)}`}
            </AppText>
            <AppText style={styles.meta}>
              {[item.parsed.bank, item.parsed.merchant, item.parsed.cardLast4 && `•••• ${item.parsed.cardLast4}`]
                .filter(Boolean)
                .join(' · ')}
            </AppText>
            {results.categories?.[item.parsed.smsId] && (
              <AppText weight="medium" style={styles.category}>
                {categoryLine(results.categories[item.parsed.smsId])}
              </AppText>
            )}
          </View>
        ) : (
          <View style={[styles.item, styles.skipped]}>
            <AppText weight="semibold" style={styles.title}>
              {item.skipped?.address}
            </AppText>
            <AppText style={styles.meta} selectable>
              {item.skipped?.body}
            </AppText>
          </View>
        )
      }
    />
  );
}

const categoryLine = ({ category, source, confidence }: Categorized) =>
  [category, source, confidence !== undefined && confidence.toFixed(2)].filter(Boolean).join(' · ');

const styles = StyleSheet.create({
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  count: { fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: spacing.sm },
  item: { gap: spacing.xs, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.white },
  skipped: { borderWidth: 1, borderColor: colors.orange },
  title: { fontSize: fontSizes.sm, color: colors.textPrimary },
  category: { fontSize: fontSizes.xs, color: colors.primary },
  meta: { fontSize: fontSizes.xs, color: colors.textSecondary },
});
