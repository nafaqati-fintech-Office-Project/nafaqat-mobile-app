import { router } from 'expo-router';
import { useEffect } from 'react';

import { loadNotifications } from './loadNotifications';
import { notificationLink } from './notificationLink';

// Tapping a budget or large-payment banner opens the screen it is about, with the item highlighted.
// Does nothing where notifications cannot run (see loadNotifications).
export function useAlertTaps(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    let remove: (() => void) | null = null;
    let active = true;
    void loadNotifications().then((Notifications) => {
      if (!active || !Notifications) return;
      const sub = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as Record<string, string | null> | undefined;
        if (!data?.referenceType) return; // a transaction banner: nothing to open
        const link = notificationLink({
          referenceType: data.referenceType ?? null,
          referenceId: data.referenceId ?? null,
          categoryCode: data.categoryCode ?? null,
        });
        if (link) router.push(link);
      });
      remove = () => sub.remove();
    });
    return () => {
      active = false;
      remove?.();
    };
  }, [enabled]);
}
