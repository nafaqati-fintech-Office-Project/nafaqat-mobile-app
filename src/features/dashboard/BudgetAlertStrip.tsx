import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { notificationLink } from '@/features/notifications/notificationLink';
import { useTopBudgetAlert } from '@/features/notifications/useTopBudgetAlert';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';

// The most urgent unread budget alert, at the top of the dashboard; tapping it opens the budget.
export function BudgetAlertStrip() {
  const { t } = useLanguage();
  const alert = useTopBudgetAlert();
  if (!alert) return null;

  const exceeded = alert.type === 'BUDGET_EXCEEDED';
  const tone = exceeded ? colors.danger : colors.orange;

  return (
    <Pressable
      onPress={() => {
        const link = notificationLink(alert);
        if (link) router.push(link);
      }}
      accessibilityRole="button"
      accessibilityLabel={`${alert.title}. ${alert.message}`}
      style={[styles.strip, { backgroundColor: exceeded ? colors.dangerSoft : colors.orangeSoft, borderColor: tone }]}>
      <Icon name="alert" color={tone} size={sizes.iconLg} />
      <View style={styles.texts}>
        <AppText weight="semibold" style={styles.title} numberOfLines={1}>
          {alert.title}
        </AppText>
        <AppText style={styles.message} numberOfLines={2}>
          {alert.message}
        </AppText>
      </View>
      <AppText weight="semibold" style={[styles.view, { color: tone }]}>
        {t('alerts.view')}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  texts: { flex: 1, gap: spacing.xxs },
  title: { fontSize: fontSizes.sm, color: colors.textPrimary },
  message: { fontSize: fontSizes.xs, color: colors.textSecondary },
  view: { fontSize: fontSizes.sm },
});
