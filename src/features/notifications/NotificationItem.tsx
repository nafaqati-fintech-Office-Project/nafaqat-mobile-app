import { Pressable, StyleSheet, View } from 'react-native';

import type { AppNotification, Severity } from './types';
import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';
import { dayTimeLabel } from '@/utils/intl';

const LOOK: Record<Severity, { icon: IconName; tint: string; tintSoft: string }> = {
  INFO: { icon: 'info', tint: colors.primary, tintSoft: colors.primarySoft },
  WARNING: { icon: 'alert', tint: colors.orange, tintSoft: colors.orangeSoft },
  CRITICAL: { icon: 'alert', tint: colors.danger, tintSoft: colors.dangerSoft },
};

type Props = { item: AppNotification; onOpen: () => void; onDelete: () => void };

// title and message are plain text from the server, shown as text only.
export function NotificationItem({ item, onOpen, onDelete }: Props) {
  const { language, t } = useLanguage();
  const look = LOOK[item.severity];
  const time = dayTimeLabel(item.createdAt, language, {
    today: t('transactions.today'),
    yesterday: t('transactions.yesterday'),
  });

  return (
    <View style={[styles.row, !item.read && styles.unreadRow]}>
      <Pressable
        onPress={onOpen}
        style={styles.open}
        accessibilityRole="button"
        accessibilityState={{ selected: !item.read }}
        accessibilityLabel={`${item.read ? '' : `${t('notifications.unread')}, `}${item.title}, ${item.message}, ${time}`}>
        <View style={[styles.tile, { backgroundColor: look.tintSoft }]}>
          <Icon name={look.icon} color={look.tint} size={sizes.icon} />
        </View>
        <View style={styles.texts}>
          <AppText weight={item.read ? 'medium' : 'bold'} style={styles.title}>
            {item.title}
          </AppText>
          {item.message ? <AppText style={styles.message}>{item.message}</AppText> : null}
          <AppText style={styles.time}>{time}</AppText>
        </View>
        {!item.read && <View style={styles.dot} />}
      </Pressable>
      <Pressable
        onPress={onDelete}
        hitSlop={spacing.sm}
        style={styles.delete}
        accessibilityRole="button"
        accessibilityLabel={t('notifications.delete')}>
        <Icon name="trash" color={colors.textSecondary} size={sizes.icon} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
  },
  unreadRow: { backgroundColor: colors.primarySoft },
  open: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  tile: {
    width: sizes.iconTile,
    height: sizes.iconTile,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: spacing.xxs },
  title: { fontSize: fontSizes.sm, color: colors.textPrimary },
  message: { fontSize: fontSizes.sm, color: colors.textSecondary },
  time: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: spacing.xxs },
  dot: { width: sizes.bellDot, height: sizes.bellDot, borderRadius: radius.pill, backgroundColor: colors.primary, marginTop: spacing.xs },
  delete: { width: sizes.touchMin, height: sizes.touchMin, alignItems: 'center', justifyContent: 'center' },
});
