import { router } from 'expo-router';
import { useEffect } from 'react';

import { loadNotifications } from './loadNotifications';
import { notificationLink } from './notificationLink';
import { markRead } from './notificationsService';
import { refreshUnreadCount } from './unreadCount';

type AlertData = Record<string, string | null> | undefined;

function openAlert(data: AlertData): void {
  // A push names the server notification it is about: opening it counts as reading it.
  if (data?.notificationId) {
    void markRead(data.notificationId)
      .then(refreshUnreadCount)
      .catch(() => undefined);
  }
  if (!data?.referenceType) return; // a transaction banner or a test push: nothing to open
  const link = notificationLink({
    referenceType: data.referenceType ?? null,
    referenceId: data.referenceId ?? null,
    categoryCode: data.categoryCode ?? null,
  });
  if (link) router.push(link);
}

// Tapping a budget, payment, subscription or goal alert (a local banner or a push) opens the screen it is about,
// with the item highlighted. Also handles the tap that started the app. Does nothing where notifications cannot
// run (see loadNotifications).
export function useAlertTaps(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    let remove: (() => void) | null = null;
    let active = true;
    void loadNotifications().then(async (Notifications) => {
      if (!active || !Notifications) return;
      const sub = Notifications.addNotificationResponseReceivedListener((response) => {
        openAlert(response.notification.request.content.data as AlertData);
      });
      remove = () => sub.remove();
      // The app was closed and the tap started it: the listener above came too late for that one.
      const launch = await Notifications.getLastNotificationResponseAsync().catch(() => null);
      if (active && launch) {
        await Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
        openAlert(launch.notification.request.content.data as AlertData);
      }
    });
    return () => {
      active = false;
      remove?.();
    };
  }, [enabled]);
}
