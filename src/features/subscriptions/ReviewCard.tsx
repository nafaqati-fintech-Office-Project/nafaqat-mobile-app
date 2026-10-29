import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { SubscriptionRow } from './SubscriptionRow';
import type { Subscription } from './types';
import { AppText } from '@/components/AppText';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, shadows, sizes, spacing } from '@/theme';

type Props = {
  items: Subscription[];
  busyId: string | null;
  onConfirm: (item: Subscription) => void;
  onDismiss: (item: Subscription) => void;
};

// Subscriptions the service found in the user's transactions, waiting for a yes or no.
export function ReviewCard({ items, busyId, onConfirm, onDismiss }: Props) {
  const { t } = useLanguage();
  if (items.length === 0) return null;

  return (
    <View style={styles.card}>
      <AppText weight="bold" style={styles.title}>
        {t('subscriptions.reviewTitle', { count: String(items.length) })}
      </AppText>
      <AppText style={styles.body}>{t('subscriptions.reviewBody')}</AppText>
      {items.map((item) => {
        const busy = busyId === item.id;
        return (
          <View key={item.id} style={styles.item}>
            <SubscriptionRow item={item} />
            {busy ? (
              <ActivityIndicator color={colors.primary} style={styles.busy} />
            ) : (
              <View style={styles.actions}>
                <Pressable
                  onPress={() => onDismiss(item)}
                  disabled={busyId !== null}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('subscriptions.notSubscription')}: ${item.name}`}
                  style={[styles.action, styles.secondary]}>
                  <AppText weight="semibold" style={styles.secondaryText}>
                    {t('subscriptions.notSubscription')}
                  </AppText>
                </Pressable>
                <Pressable
                  onPress={() => onConfirm(item)}
                  disabled={busyId !== null}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('subscriptions.confirm')}: ${item.name}`}
                  style={[styles.action, styles.primary]}>
                  <AppText weight="semibold" style={styles.primaryText}>
                    {t('subscriptions.confirm')}
                  </AppText>
                </Pressable>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    gap: spacing.xs,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  title: { fontSize: fontSizes.md, color: colors.textPrimary },
  body: { fontSize: fontSizes.xs, color: colors.textSecondary },
  item: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingBottom: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1, minHeight: sizes.touchMin, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  primary: { backgroundColor: colors.primary },
  primaryText: { fontSize: fontSizes.sm, color: colors.white },
  secondary: { borderWidth: 1, borderColor: colors.border },
  secondaryText: { fontSize: fontSizes.sm, color: colors.textPrimary },
  busy: { minHeight: sizes.touchMin },
});
