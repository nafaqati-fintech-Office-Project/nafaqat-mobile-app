import { Pressable, StyleSheet, View } from 'react-native';

import type { SubscriptionView } from './subscriptionMath';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, shadows, sizes, spacing } from '@/theme';
import { formatMoney } from '@/utils/money';

type Props = { view: SubscriptionView; showingAttention: boolean; onToggleAttention: () => void };

// "You're paying ... / month" and what is due in the next 30 days, as the subscription service reports them.
export function SubscriptionSummaryCards({ view, showingAttention, onToggleAttention }: Props) {
  const { language, t } = useLanguage();
  const money = (amount: string) => formatMoney(amount, view.currency, language);

  return (
    <View style={styles.cards}>
      <View style={[styles.card, styles.paying]}>
        <View style={styles.payingTile}>
          <Icon name="subscriptions" color={colors.white} size={sizes.iconLg} />
        </View>
        <View style={styles.texts}>
          <AppText style={styles.payingLabel}>{t('subscriptions.youArePaying')}</AppText>
          <AppText weight="bold" style={styles.payingAmount} numberOfLines={1} adjustsFontSizeToFit>
            {`${money(view.perMonth)}${t('subscriptions.perMonth')}`}
          </AppText>
          <AppText style={styles.payingLabel}>
            {t('subscriptions.activeCount', { count: String(view.active.length) })}
          </AppText>
        </View>
      </View>

      <View style={[styles.card, styles.due]}>
        <View style={styles.dueTop}>
          <View style={styles.dueTile}>
            <Icon name="budget" color={colors.orange} size={sizes.iconLg} />
          </View>
          <View style={styles.texts}>
            <AppText style={styles.dueLabel}>{t('subscriptions.dueSoon')}</AppText>
            <AppText weight="bold" style={styles.dueAmount}>
              {money(view.dueSoon.total)}
            </AppText>
            <AppText style={styles.dueLabel}>
              {t('subscriptions.dueCount', { count: String(view.dueSoon.count) })}
            </AppText>
          </View>
        </View>
        {view.attention.length > 0 && (
          <Pressable
            onPress={onToggleAttention}
            accessibilityRole="button"
            accessibilityState={{ selected: showingAttention }}
            style={[styles.button, showingAttention && styles.buttonOn]}>
            <AppText weight="semibold" style={[styles.buttonText, showingAttention && styles.buttonTextOn]}>
              {showingAttention
                ? t('subscriptions.showAll')
                : t('subscriptions.showAttention', { count: String(view.attention.length) })}
            </AppText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cards: { gap: spacing.md },
  card: { padding: spacing.lg, borderRadius: radius.xl, ...shadows.card },
  paying: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.primary },
  payingTile: {
    width: sizes.iconTile + spacing.sm,
    height: sizes.iconTile + spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  texts: { flex: 1, gap: spacing.xxs },
  payingLabel: { fontSize: fontSizes.xs, color: colors.white, opacity: 0.85 },
  payingAmount: { fontSize: fontSizes.xl, color: colors.white },
  due: { gap: spacing.md, backgroundColor: colors.white },
  dueTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dueTile: {
    width: sizes.iconTile,
    height: sizes.iconTile,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.orangeSoft,
  },
  dueLabel: { fontSize: fontSizes.xs, color: colors.textSecondary },
  dueAmount: { fontSize: fontSizes.lg, color: colors.textPrimary },
  button: {
    minHeight: sizes.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonOn: { backgroundColor: colors.primary },
  buttonText: { fontSize: fontSizes.sm, color: colors.primary },
  buttonTextOn: { color: colors.white },
});
