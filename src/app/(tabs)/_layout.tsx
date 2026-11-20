import { Redirect, Tabs } from 'expo-router';

import { useAuth } from '@/auth/AuthProvider';
import { Icon, type IconName } from '@/components/Icon';
import { AUTH_BYPASS } from '@/config/flags';
import { usePendingDeletion } from '@/features/account/usePendingDeletion';
import { useFeedbackSync } from '@/features/categorizer/feedback/useFeedbackSync';
import { useLocalModelUpdate } from '@/features/categorizer/useLocalModelUpdate';
import { useRecategorizeOldRows } from '@/features/categorizer/useRecategorizeOldRows';
import { useRetryPendingPredictions } from '@/features/categorizer/useRetryPendingPredictions';
import { useAlertTaps } from '@/features/notifications/useAlertTaps';
import { useUnreadCountPolling } from '@/features/notifications/unreadCount';
import { usePushRegistration } from '@/features/notifications/usePushRegistration';
import { useTransactionSync } from '@/features/transactions/sync/useTransactionSync';
import type { TranslationKey } from '@/i18n';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontFamily, fontSizes, shadows, sizes } from '@/theme';

const TABS: { name: string; icon: IconName; label: TranslationKey }[] = [
  { name: 'home', icon: 'home', label: 'tabs.home' },
  { name: 'transactions', icon: 'transactions', label: 'tabs.transactions' },
  { name: 'insights', icon: 'insights', label: 'tabs.insights' },
  { name: 'assistant', icon: 'assistant', label: 'tabs.assistant' },
  { name: 'more', icon: 'more', label: 'tabs.more' },
];

export default function TabsLayout() {
  const { status, user } = useAuth();
  const { t } = useLanguage();
  useRetryPendingPredictions(status === 'authenticated');
  // The merchant model runs on the phone; this keeps it the same as the server's (no app update needed).
  useLocalModelUpdate(status === 'authenticated' && !AUTH_BYPASS);
  // Once per account: transactions saved before the categories improved get another look.
  useRecategorizeOldRows(status === 'authenticated' && !AUTH_BYPASS);
  // Bypass mode has a mock user and no token, so there is no account to sync to.
  useTransactionSync(status === 'authenticated' && !AUTH_BYPASS, user?.id ?? null);
  useFeedbackSync(status === 'authenticated' && !AUTH_BYPASS);
  // The bell's unread badge (bypass mode counts the sample notifications).
  useUnreadCountPolling(status === 'authenticated');
  useAlertTaps(status === 'authenticated');
  // Bypass mode fetches the push token but has no account to send it to (see registerForPush).
  usePushRegistration(status === 'authenticated');
  // An account scheduled for deletion shows the restore screen first.
  usePendingDeletion(status === 'authenticated' && !AUTH_BYPASS, user?.id ?? null);

  if (status !== 'authenticated') return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontFamily: fontFamily('medium'), fontSize: fontSizes.xs },
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          ...shadows.tabBar,
        },
      }}>
      {TABS.map(({ name, icon, label }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: t(label),
            tabBarIcon: ({ color }) => <Icon name={icon} color={color} size={sizes.tabIcon} />,
          }}
        />
      ))}
    </Tabs>
  );
}
