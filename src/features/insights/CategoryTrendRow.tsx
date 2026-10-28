import { StyleSheet, View } from 'react-native';

import { ChangeChip } from './ChangeChip';
import type { CategoryTrend } from './types';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { categoryLabelKey } from '@/features/transactions/categoryDisplay';
import { categoryLook } from '@/features/transactions/categoryLook';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';
import { formatMoney } from '@/utils/money';

export function CategoryTrendRow({ item, currency }: { item: CategoryTrend; currency: string }) {
  const { language, t } = useLanguage();
  const look = categoryLook(item.category);
  const labelKey = categoryLabelKey(item.category);

  return (
    <View style={styles.row}>
      <View style={[styles.tile, { backgroundColor: look.tintSoft }]}>
        <Icon name={look.icon} color={look.tint} size={sizes.iconLg} />
      </View>
      <View style={styles.texts}>
        <AppText weight="semibold" style={styles.name} numberOfLines={1}>
          {labelKey ? t(labelKey) : item.category}
        </AppText>
        <AppText style={styles.meta} numberOfLines={1}>
          {t('insights.vsLastMonth')}
        </AppText>
      </View>
      <View style={styles.end}>
        <AppText weight="bold" style={styles.amount}>
          {formatMoney(item.amount, currency, language)}
        </AppText>
        <ChangeChip percent={item.changePercent} goodWhen="down" />
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
  end: { alignItems: 'flex-end', gap: spacing.xs },
  name: { fontSize: fontSizes.sm, color: colors.textPrimary },
  meta: { fontSize: fontSizes.xs, color: colors.textSecondary },
  amount: { fontSize: fontSizes.sm, color: colors.textPrimary },
});
