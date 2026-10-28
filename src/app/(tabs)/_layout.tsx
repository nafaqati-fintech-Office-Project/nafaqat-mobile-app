import { Redirect, Tabs } from 'expo-router';

import { useAuth } from '@/auth/AuthProvider';
import { Icon, type IconName } from '@/components/Icon';
import { useRetryPendingPredictions } from '@/features/categorizer/useRetryPendingPredictions';
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
  const { status } = useAuth();
  const { t } = useLanguage();
  useRetryPendingPredictions(status === 'authenticated');

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
