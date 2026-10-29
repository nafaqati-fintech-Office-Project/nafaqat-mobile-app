import { Pressable, StyleSheet, View } from 'react-native';

import type { SubscriptionSummary } from './subscriptionMath';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, shadows, sizes, spacing } from '@/theme';
import { formatMoney } from '@/utils/money';

type Props = { summary: SubscriptionSummary; showingUnused: boolean; onFindUnused: () => void };

// "You're paying ... / month" and "Potential annual saving", as in the design reference.
export function SubscriptionSummaryCards({ summary, showingUnused, onFindUnused }: Props) {
  const { language, t } = useLanguage();
  const money = (amount: string) => formatMoney(amount, summary.currency, language);

  return (
    <View style={styles.cards}>
      <View style={[styles.card, styles.paying]}>
        <View style={styles.payingTile}>
          <Icon name="subscriptions" color={colors.white} size={sizes.iconLg} />
        </View>
        <View style={styles.texts}>
          <AppText style={styles.payingLabel}>{t('subscriptions.youArePaying')}</AppText>
          <AppText weight="bold" style={styles.payingAmount} numberOfLines={1} adjustsFontSizeToFit>
            {`${money(summary.perMonth)}${t('subscriptions.perMonth')}`}
          </AppText>
          <AppText style={styles.payingLabel}>
            {t('subscriptions.activeCount', { count: String(summary.active.length) })}
          </AppText>
        </View>
      </View>

      {summary.unused.length > 0 && (
        <View style={[styles.card, styles.saving]}>
          <View style={styles.savingTop}>
            <View style={styles.savingTile}>
              <Icon name="savings" color={colors.orange} size={sizes.iconLg} />
            </View>
            <View style={styles.texts}>
              <AppText style={styles.savingLabel}>{t('subscriptions.potentialSaving')}</AppText>
              <AppText weight="bold" style={styles.savingAmount}>
                {money(summary.potentialYearly)}
              </AppText>
            </View>
          </View>
          <Pressable
            onPress={onFindUnused}
            accessibilityRole="button"
            accessibilityState={{ selected: showingUnused }}
            style={[styles.findButton, showingUnused && styles.findButtonOn]}>
            <AppText weight="semibold" style={[styles.findText, showingUnused && styles.findTextOn]}>
              {t(showingUnused ? 'subscriptions.showAll' : 'subscriptions.findUnused')}
            </AppText>
          </Pressable>
        </View>
      )}
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
  saving: { gap: spacing.md, backgroundColor: colors.white },
  savingTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  savingTile: {
    width: sizes.iconTile,
    height: sizes.iconTile,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.orangeSoft,
  },
  savingLabel: { fontSize: fontSizes.xs, color: colors.textSecondary },
  savingAmount: { fontSize: fontSizes.lg, color: colors.danger },
  findButton: {
    minHeight: sizes.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  findButtonOn: { backgroundColor: colors.primary },
  findText: { fontSize: fontSizes.sm, color: colors.primary },
  findTextOn: { color: colors.white },
});
