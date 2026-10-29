import { StyleSheet, View } from 'react-native';

import { categoryLabelKey } from './categoryDisplay';
import { categoryLook } from './categoryLook';
import { daysAgo } from './groupByDay';
import type { TransactionItem } from './transactionsApi';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';
import { intlLocale } from '@/utils/intl';
import { formatMoney } from '@/utils/money';

// showDay: the row is not under a day heading (as on the dashboard), so it says which day too.
export function TransactionListItem({ item, showDay = false }: { item: TransactionItem; showDay?: boolean }) {
  const { language, t } = useLanguage();
  const look = categoryLook(item.category);
  const debit = item.type === 'DEBIT';
  const amount = `${debit ? '-' : '+'} ${formatMoney(item.amount, item.currency, language)}`;
  const labelKey = categoryLabelKey(item.category);
  const locale = intlLocale(language);
  const clock = new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(item.date);
  const ago = daysAgo(item.date);
  const day =
    ago === 0
      ? t('transactions.today')
      : ago === 1
        ? t('transactions.yesterday')
        : new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(item.date);
  const time = showDay ? `${day}, ${clock}` : clock;

  return (
    <View style={styles.row}>
      <View style={[styles.tile, { backgroundColor: look.tintSoft }]}>
        <Icon name={look.icon} color={look.tint} size={sizes.iconLg} />
      </View>
      <View style={styles.texts}>
        <AppText weight="semibold" style={styles.merchant} numberOfLines={1}>
          {item.merchant ?? t('transactions.unknownMerchant')}
        </AppText>
        <AppText style={styles.meta} numberOfLines={1}>
          {labelKey ? t(labelKey) : item.category}
        </AppText>
      </View>
      <View style={styles.end}>
        <AppText weight="bold" style={[styles.amount, { color: debit ? colors.danger : colors.success }]}>
          {amount}
        </AppText>
        <AppText style={styles.meta}>{time}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  tile: {
    width: sizes.iconTile,
    height: sizes.iconTile,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: spacing.xxs },
  end: { alignItems: 'flex-end', gap: spacing.xxs },
  merchant: { fontSize: fontSizes.sm, color: colors.textPrimary },
  meta: { fontSize: fontSizes.xs, color: colors.textSecondary },
  amount: { fontSize: fontSizes.sm },
});
