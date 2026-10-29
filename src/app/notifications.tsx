import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { showToast } from '@/components/Toast';
import { NotificationItem } from '@/features/notifications/NotificationItem';
import { notificationLink } from '@/features/notifications/notificationLink';
import type { AppNotification } from '@/features/notifications/types';
import { useNotificationList } from '@/features/notifications/useNotificationList';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';

export default function NotificationsRoute() {
  const { t, isRTL } = useLanguage();
  const list = useNotificationList();
  const { items, status, reload } = list;
  const anyUnread = items.some((n) => !n.read);

  // Coming back to the screen picks up alerts created meanwhile; the first focus is the initial load.
  const focused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focused.current) void reload();
      focused.current = true;
    }, [reload]),
  );

  const failed = (ok: boolean) => {
    if (!ok) showToast(t('notifications.actionFailed'));
  };

  const open = async (item: AppNotification) => {
    const link = notificationLink(item);
    if (!item.read) {
      // Open the related screen at once; the read mark is sent meanwhile.
      const done = list.markRead(item.id);
      if (!link) failed(await done);
      else void done.then(failed);
    }
    // navigate, not push: a tab (Transactions) is switched to with the new highlight, not opened twice.
    if (link) router.navigate(link);
  };

  const confirmDelete = (item: AppNotification) =>
    Alert.alert(t('notifications.deleteTitle'), item.title, [
      { text: t('notifications.cancel'), style: 'cancel' },
      { text: t('notifications.delete'), style: 'destructive', onPress: async () => failed(await list.remove(item.id)) },
    ]);

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
          accessibilityRole="button"
          accessibilityLabel={t('budget.back')}
          style={styles.side}>
          {/* The chevron points right; flip it to point back in left-to-right layouts. */}
          <View style={!isRTL && styles.flip}>
            <Icon name="chevron" color={colors.textPrimary} size={sizes.iconLg} />
          </View>
        </Pressable>
        <AppText weight="bold" style={styles.title} accessibilityRole="header">
          {t('notifications.title')}
        </AppText>
        <Pressable
          onPress={() => router.push('/notification-settings')}
          accessibilityRole="button"
          accessibilityLabel={t('notifications.settings')}
          style={styles.side}>
          <Icon name="sliders" color={colors.textPrimary} size={sizes.iconLg} />
        </Pressable>
      </View>

      {status === 'loading' ? (
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      ) : status === 'error' ? (
        <View style={styles.message}>
          <AppText weight="medium" style={styles.messageTitle}>
            {t('notifications.loadError')}
          </AppText>
          <PrimaryButton label={t('budget.retry')} onPress={list.retry} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} />}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            anyUnread ? (
              <Pressable
                onPress={async () => failed(await list.markAllRead())}
                accessibilityRole="button"
                style={styles.markAll}>
                <Icon name="check" color={colors.primary} size={sizes.icon} />
                <AppText weight="semibold" style={styles.markAllText}>
                  {t('notifications.markAllRead')}
                </AppText>
              </Pressable>
            ) : undefined
          }
          ListEmptyComponent={
            <View style={styles.message}>
              <View style={styles.emptyIcon}>
                <Icon name="bell" color={colors.primary} size={sizes.iconLg} />
              </View>
              <AppText weight="bold" style={styles.messageTitle}>
                {t('notifications.empty.title')}
              </AppText>
              <AppText style={styles.messageBody}>{t('notifications.empty.body')}</AppText>
            </View>
          }
          ListFooterComponent={list.loadingMore ? <ActivityIndicator color={colors.primary} /> : undefined}
          renderItem={({ item }) => (
            <NotificationItem item={item} onOpen={() => void open(item)} onDelete={() => confirmDelete(item)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgLight },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg },
  side: { width: sizes.touchMin, height: sizes.touchMin, alignItems: 'center', justifyContent: 'center' },
  flip: { transform: [{ scaleX: -1 }] },
  title: { flex: 1, textAlign: 'center', fontSize: fontSizes.lg, color: colors.textPrimary },
  content: { flexGrow: 1, padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.sm, paddingBottom: spacing.xxl },
  spinner: { marginTop: spacing.xxxl },
  markAll: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: spacing.xs, minHeight: sizes.touchMin },
  markAllText: { fontSize: fontSizes.sm, color: colors.primary },
  message: { gap: spacing.md, alignItems: 'center', padding: spacing.xl, paddingVertical: spacing.xxl },
  emptyIcon: {
    width: sizes.iconTile,
    height: sizes.iconTile,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  messageTitle: { fontSize: fontSizes.md, color: colors.textPrimary, textAlign: 'center' },
  messageBody: { fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center' },
});
