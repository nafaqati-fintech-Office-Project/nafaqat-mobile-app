import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { priceWentUp } from './subscriptionMath';
import type { BillingCycle, Subscription } from './types';
import { AppText } from '@/components/AppText';
import type { TranslationKey } from '@/i18n';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, lineHeights, radius, sizes, spacing } from '@/theme';
import { intlLocale } from '@/utils/intl';
import { formatMoney } from '@/utils/money';

// Letter tiles instead of brand logos; the colour follows the name so it stays the same between visits.
const TONES = [
  { tint: colors.danger, soft: colors.dangerSoft },
  { tint: colors.success, soft: colors.successSoft },
  { tint: colors.primary, soft: colors.primarySoft },
  { tint: colors.violet, soft: colors.violetSoft },
  { tint: colors.orange, soft: colors.orangeSoft },
];
const toneOf = (name: string) => TONES[[...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % TONES.length];

export const CYCLE_LABEL: Record<BillingCycle, TranslationKey> = {
  WEEKLY: 'subscriptions.cycle.weekly',
  MONTHLY: 'subscriptions.cycle.monthly',
  QUARTERLY: 'subscriptions.cycle.quarterly',
  YEARLY: 'subscriptions.cycle.yearly',
};

const PER: Record<BillingCycle, TranslationKey> = {
  WEEKLY: 'subscriptions.perWeek',
  MONTHLY: 'subscriptions.perMonth',
  QUARTERLY: 'subscriptions.perQuarter',
  YEARLY: 'subscriptions.perYear',
};

type Props = { item: Subscription; onPress?: () => void; busy?: boolean };

export function SubscriptionRow({ item, onPress, busy = false }: Props) {
  const { language, t } = useLanguage();
  const tone = toneOf(item.name);
  const day = (date: Date) => new Intl.DateTimeFormat(intlLocale(language), { day: 'numeric', month: 'short' }).format(date);
  const money = (amount: string) => formatMoney(amount, item.currency, language);
  const raised = priceWentUp(item);

  const when =
    item.status === 'ENDED'
      ? item.lastChargeDate && t('subscriptions.lastCharge', { date: day(item.lastChargeDate) })
      : item.nextDate &&
        t(item.overdue ? 'subscriptions.expected' : 'subscriptions.next', { date: day(item.nextDate) });
  const meta = [t(CYCLE_LABEL[item.cycle]), item.source === 'MANUAL' ? t('subscriptions.addedByYou') : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress || busy}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityHint={onPress ? t('subscriptions.rowHint') : undefined}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.tile, { backgroundColor: tone.soft }]}>
        <AppText weight="bold" style={[styles.letter, { color: tone.tint }]}>
          {item.name.charAt(0).toUpperCase()}
        </AppText>
      </View>
      <View style={styles.texts}>
        <AppText weight="semibold" style={styles.name} numberOfLines={1}>
          {item.name}
        </AppText>
        <AppText style={styles.meta} numberOfLines={1}>
          {meta}
        </AppText>
        {(item.overdue || raised) && item.status === 'CONFIRMED' && (
          <View style={styles.tags}>
            {item.overdue && (
              <View style={[styles.tag, { backgroundColor: colors.dangerSoft }]}>
                <AppText weight="semibold" style={[styles.tagText, { color: colors.danger }]}>
                  {t('subscriptions.overdueTag')}
                </AppText>
              </View>
            )}
            {raised && item.previousAmount && (
              <View style={[styles.tag, { backgroundColor: colors.orangeSoft }]}>
                <AppText weight="semibold" style={[styles.tagText, { color: colors.orange }]}>
                  {t('subscriptions.priceUpTag', { amount: money(item.previousAmount) })}
                </AppText>
              </View>
            )}
          </View>
        )}
      </View>
      <View style={styles.end}>
        {busy ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <AppText weight="bold" style={[styles.amount, item.status === 'ENDED' && styles.ended]}>
            {`${money(item.amount)}${t(PER[item.cycle])}`}
          </AppText>
        )}
        {when ? <AppText style={[styles.meta, item.overdue && styles.overdue]}>{when}</AppText> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  pressed: { opacity: 0.6 },
  tile: { width: sizes.iconTile, height: sizes.iconTile, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  letter: { fontSize: fontSizes.md },
  texts: { flex: 1, gap: spacing.xxs },
  name: { fontSize: fontSizes.sm, color: colors.textPrimary },
  meta: { fontSize: fontSizes.xs, color: colors.textSecondary },
  overdue: { color: colors.danger },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xxs },
  tag: { paddingHorizontal: spacing.sm, borderRadius: radius.pill },
  tagText: { fontSize: fontSizes.xxs, lineHeight: lineHeights.xs },
  end: { alignItems: 'flex-end', gap: spacing.xxs },
  amount: { fontSize: fontSizes.sm, color: colors.textPrimary },
  ended: { color: colors.textSecondary, textDecorationLine: 'line-through' },
});
