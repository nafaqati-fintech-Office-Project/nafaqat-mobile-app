import { StyleSheet, View } from 'react-native';

import { ProgressBar } from './ProgressBar';
import type { CategoryBudget } from './types';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { categoryLabelKey } from '@/features/transactions/categoryDisplay';
import { categoryLook } from '@/features/transactions/categoryLook';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';
import { formatMoney } from '@/utils/money';

export function CategoryBudgetRow({ item, currency }: { item: CategoryBudget; currency: string }) {
  const { language, t } = useLanguage();
  const look = categoryLook(item.category);
  const labelKey = categoryLabelKey(item.category);
  const money = (amount: string) => formatMoney(amount, currency, language);

  return (
    <View style={styles.row}>
      <View style={[styles.tile, { backgroundColor: look.tintSoft }]}>
        <Icon name={look.icon} color={look.tint} size={sizes.iconLg} />
      </View>
      <View style={styles.body}>
        <View style={styles.top}>
          <View style={styles.texts}>
            <AppText weight="semibold" style={styles.name} numberOfLines={1}>
              {labelKey ? t(labelKey) : item.category}
            </AppText>
            <AppText style={styles.meta} numberOfLines={1}>
              {`${money(item.spent)} / ${money(item.limit)}`}
            </AppText>
          </View>
          <AppText weight="bold" style={styles.percent}>{`${item.percent}%`}</AppText>
        </View>
        <ProgressBar percent={item.percent} tone={item.tone} />
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
  body: { flex: 1, gap: spacing.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  texts: { flex: 1, gap: spacing.xxs },
  name: { fontSize: fontSizes.sm, color: colors.textPrimary },
  meta: { fontSize: fontSizes.xs, color: colors.textSecondary },
  percent: { fontSize: fontSizes.sm, color: colors.textPrimary },
});
