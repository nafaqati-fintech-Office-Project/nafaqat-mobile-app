import { useEffect, useState } from 'react';

import { topBudgetAlert } from './budgetAlerts';
import { getNotifications } from './notificationsService';
import type { AppNotification } from './types';
import { useUnreadCount } from './unreadCount';

// The unread budget alert for the dashboard strip. It is looked up again whenever the unread count
// changes (new alert from the poll, or one read in the list), so the strip goes away once it is read.
export function useTopBudgetAlert(): AppNotification | null {
  const unread = useUnreadCount();
  const [alert, setAlert] = useState<AppNotification | null>(null);

  useEffect(() => {
    let active = true;
    // Nothing unread means no unread alert: no need to ask the server.
    if (unread === 0) return;
    getNotifications(0, 20)
      .then((page) => active && setAlert(topBudgetAlert(page.items)))
      .catch(() => {
        // keep what is shown; the next change tries again
      });
    return () => {
      active = false;
    };
  }, [unread]);

  return unread === 0 ? null : alert;
}
