import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { CategoryChip } from './CategoryChip';
import type { StoredTransaction } from './transactionsRepo';
import { AppText } from '@/components/AppText';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, shadows, spacing } from '@/theme';
import { intlLocale } from '@/utils/intl';
import { formatMoney } from '@/utils/money';

export function TransactionRow({ item }: { item: StoredTransaction }) {
  const { language, t } = useLanguage();
  const debit = item.type === 'DEBIT';
  const amount = formatMoney(item.amount, item.currency, language);
  const date = new Intl.DateTimeFormat(intlLocale(language), { dateStyle: 'medium' }).format(
    new Date(item.date),
  );

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/change-category', params: { id: String(item.id) } })}
      accessibilityRole="button"
      accessibilityHint={t('category.change')}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.texts}>
        <AppText weight="semibold" style={styles.title} numberOfLines={1}>
          {item.merchant ?? item.bank}
        </AppText>
        <View style={styles.metaRow}>
          <CategoryChip category={item.category} />
          <AppText style={styles.meta} numberOfLines={1}>
            {date}
          </AppText>
        </View>
      </View>
      <AppText weight="bold" style={[styles.amount, { color: debit ? colors.danger : colors.success }]}>
        {`${debit ? '-' : '+'}${amount}`}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  texts: { flex: 1, gap: spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: fontSizes.md, color: colors.textPrimary },
  meta: { fontSize: fontSizes.xs, color: colors.textSecondary },
  amount: { fontSize: fontSizes.sm },
  pressed: { opacity: 0.7 },
});
