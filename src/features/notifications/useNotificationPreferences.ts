import { useCallback, useEffect, useState } from 'react';

import * as service from './notificationsService';
import { MANDATORY_TYPES, NOTIFICATION_TYPES, type NotificationPreference, type NotificationType } from './types';

type Status = 'loading' | 'ready' | 'error';

// In the app's order, whatever order the server sends them in.
const ordered = (prefs: NotificationPreference[]) =>
  NOTIFICATION_TYPES.flatMap((type) => prefs.filter((p) => p.type === type));

export const isMandatory = (type: NotificationType) => MANDATORY_TYPES.includes(type);

export function useNotificationPreferences() {
  const [prefs, setPrefs] = useState<NotificationPreference[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [saving, setSaving] = useState<NotificationType | null>(null);

  const show = useCallback((result: NotificationPreference[]) => {
    setPrefs(ordered(result));
    setStatus('ready');
  }, []);

  useEffect(() => {
    let active = true;
    service
      .getPreferences()
      .then((result) => active && show(result))
      .catch(() => active && setStatus('error'));
    return () => {
      active = false;
    };
  }, [show]);

  const retry = async () => {
    setStatus('loading');
    try {
      show(await service.getPreferences());
    } catch {
      setStatus('error');
    }
  };

  // The switch moves at once and goes back if the server refuses. Returns false then.
  const toggle = async (type: NotificationType, enabled: boolean): Promise<boolean> => {
    if (isMandatory(type)) return true;
    const before = prefs;
    setPrefs(before.map((p) => (p.type === type ? { ...p, enabled } : p)));
    setSaving(type);
    try {
      setPrefs(ordered(await service.savePreference({ type, enabled })));
      return true;
    } catch {
      setPrefs(before);
      return false;
    } finally {
      setSaving(null);
    }
  };

  return { prefs, status, saving, retry, toggle };
}
