import { StyleSheet, View } from 'react-native';

import type { Subscription, SubscriptionTone } from './types';
import { AppText } from '@/components/AppText';
import { categoryLabelKey } from '@/features/transactions/categoryDisplay';
import type { TranslationKey } from '@/i18n';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, lineHeights, radius, sizes, spacing } from '@/theme';
import { intlLocale } from '@/utils/intl';
import { formatMoney } from '@/utils/money';

export const TONES: Record<SubscriptionTone, { tint: string; soft: string }> = {
  red: { tint: colors.danger, soft: colors.dangerSoft },
  green: { tint: colors.success, soft: colors.successSoft },
  blue: { tint: colors.primary, soft: colors.primarySoft },
  violet: { tint: colors.violet, soft: colors.violetSoft },
  orange: { tint: colors.orange, soft: colors.orangeSoft },
};

const CYCLE: Record<Subscription['cycle'], TranslationKey> = {
  WEEKLY: 'subscriptions.perWeek',
  MONTHLY: 'subscriptions.perMonth',
  YEARLY: 'subscriptions.perYear',
};

export function SubscriptionRow({ item }: { item: Subscription }) {
  const { language, t } = useLanguage();
  const tone = TONES[item.tone];
  const labelKey = categoryLabelKey(item.category);
  const day = new Intl.DateTimeFormat(intlLocale(language), { day: 'numeric', month: 'short' }).format(item.date);
  const when = t(item.status === 'active' ? 'subscriptions.next' : 'subscriptions.endedOn', { date: day });

  return (
    <View style={styles.row}>
      <View style={[styles.tile, { backgroundColor: tone.soft }]}>
        <AppText weight="bold" style={[styles.letter, { color: tone.tint }]}>
          {item.name.charAt(0).toUpperCase()}
        </AppText>
      </View>
      <View style={styles.texts}>
        <AppText weight="semibold" style={styles.name} numberOfLines={1}>
          {item.name}
        </AppText>
        <View style={styles.metaRow}>
          <AppText style={styles.meta} numberOfLines={1}>
            {labelKey ? t(labelKey) : item.category}
          </AppText>
          {item.unused && item.status === 'active' && (
            <View style={styles.unused}>
              <AppText weight="semibold" style={styles.unusedText}>
                {t('subscriptions.unusedTag')}
              </AppText>
            </View>
          )}
        </View>
      </View>
      <View style={styles.end}>
        <AppText weight="bold" style={[styles.amount, item.status === 'cancelled' && styles.cancelled]}>
          {`${formatMoney(item.amount, item.currency, language)}${t(CYCLE[item.cycle])}`}
        </AppText>
        <AppText style={styles.meta}>{when}</AppText>
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
  letter: { fontSize: fontSizes.md },
  texts: { flex: 1, gap: spacing.xxs },
  name: { fontSize: fontSizes.sm, color: colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  meta: { fontSize: fontSizes.xs, color: colors.textSecondary },
  unused: { paddingHorizontal: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.orangeSoft },
  unusedText: { fontSize: fontSizes.xxs, lineHeight: lineHeights.xs, color: colors.orange },
  end: { alignItems: 'flex-end', gap: spacing.xxs },
  amount: { fontSize: fontSizes.sm, color: colors.textPrimary },
  cancelled: { color: colors.textSecondary, textDecorationLine: 'line-through' },
});
