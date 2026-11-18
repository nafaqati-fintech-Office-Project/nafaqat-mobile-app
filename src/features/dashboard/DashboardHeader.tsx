import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { Logo } from '@/components/Logo';
import { useUnreadCount } from '@/features/notifications/unreadCount';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, lineHeights, radius, sizes, spacing } from '@/theme';

const badgeText = (count: number) => (count > 99 ? '99+' : String(count));

export function DashboardHeader() {
  const { t } = useLanguage();
  const unread = useUnreadCount();

  return (
    <View style={styles.row}>
      <View style={styles.brand}>
        <Logo size={sizes.logoHeader} />
        <AppText weight="bold" style={styles.name}>
          {t('appName')}
        </AppText>
      </View>
      <Pressable
        onPress={() => router.push('/notifications')}
        accessibilityRole="button"
        accessibilityLabel={
          unread > 0 ? `${t('dashboard.notifications')}, ${unread} ${t('notifications.unread')}` : t('dashboard.notifications')
        }
        style={styles.bell}>
        <Icon name="bell" color={colors.textPrimary} size={sizes.iconLg} />
        {unread > 0 && (
          <View style={styles.badge}>
            <AppText weight="bold" style={styles.badgeText}>
              {badgeText(unread)}
            </AppText>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: sizes.touchMin },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { fontSize: fontSizes.lg, color: colors.textPrimary },
  bell: { width: sizes.bell, height: sizes.bell, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: spacing.xs,
    end: spacing.xs,
    minWidth: sizes.bellBadge,
    height: sizes.bellBadge,
    paddingHorizontal: spacing.xxs,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.bgLight,
  },
  badgeText: { fontSize: fontSizes.xxs, lineHeight: lineHeights.xxs, color: colors.white },
});
