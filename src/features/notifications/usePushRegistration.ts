import { useEffect } from 'react';

import { loadNotifications } from './loadNotifications';
import { registerForPush } from './push';
import { refreshUnreadCount } from './unreadCount';
import { useLanguage } from '@/i18n/LanguageProvider';

// After sign-in: register this phone for pushes, asking for permission only the first time. Registers again when
// the language changes (the server writes push texts in it) and when the phone gets a new token. A push that
// arrives while the app is open refreshes the bell's badge at once instead of at the next poll.
export function usePushRegistration(enabled: boolean): void {
  const { language } = useLanguage();

  useEffect(() => {
    if (enabled) void registerForPush('once');
  }, [enabled, language]);

  useEffect(() => {
    if (!enabled) return;
    let remove: (() => void) | null = null;
    let active = true;
    void loadNotifications().then((Notifications) => {
      if (!active || !Notifications) return;
      const tokenSub = Notifications.addPushTokenListener(() => void registerForPush('once'));
      const receivedSub = Notifications.addNotificationReceivedListener(() => void refreshUnreadCount());
      remove = () => {
        tokenSub.remove();
        receivedSub.remove();
      };
    });
    return () => {
      active = false;
      remove?.();
    };
  }, [enabled]);
}
