import { StyleSheet, View } from 'react-native';

import type { MerchantTotal } from './types';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { categoryLabelKey } from '@/features/transactions/categoryDisplay';
import { categoryLook } from '@/features/transactions/categoryLook';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';
import { formatMoney } from '@/utils/money';

type Props = { item: MerchantTotal; rank: number; currency: string };

export function MerchantRow({ item, rank, currency }: Props) {
  const { language, t } = useLanguage();
  const look = categoryLook(item.category);
  const labelKey = categoryLabelKey(item.category);

  return (
    <View style={styles.row}>
      <AppText weight="bold" style={styles.rank}>
        {rank}
      </AppText>
      <View style={[styles.tile, { backgroundColor: look.tintSoft }]}>
        <Icon name={look.icon} color={look.tint} size={sizes.iconLg} />
      </View>
      <View style={styles.texts}>
        <AppText weight="semibold" style={styles.name} numberOfLines={1}>
          {item.merchant}
        </AppText>
        <AppText style={styles.meta} numberOfLines={1}>
          {`${labelKey ? t(labelKey) : item.category} · ${item.count} ${t('insights.payments')}`}
        </AppText>
      </View>
      <AppText weight="bold" style={styles.amount}>
        {formatMoney(item.amount, currency, language)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  rank: { width: spacing.lg, fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center' },
  tile: {
    width: sizes.iconTile,
    height: sizes.iconTile,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: spacing.xxs },
  name: { fontSize: fontSizes.sm, color: colors.textPrimary },
  meta: { fontSize: fontSizes.xs, color: colors.textSecondary },
  amount: { fontSize: fontSizes.sm, color: colors.textPrimary },
});
