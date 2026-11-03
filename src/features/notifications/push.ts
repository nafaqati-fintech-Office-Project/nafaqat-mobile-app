import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { loadNotifications } from './loadNotifications';
import { presentInForeground } from './notify';
import { registerPushToken, unregisterPushToken } from './pushApi';
import { AUTH_BYPASS } from '@/config/flags';
import { getLanguage, t } from '@/i18n';

const ASKED_KEY = 'nafaqati.push.asked';
const TOKEN_KEY = 'nafaqati.push.token';

// Android channels the server's pushes name (PushSender in notification-service): budget and payment alerts, the rest.
export const BUDGET_CHANNEL_ID = 'budget-alerts';
export const ALERTS_CHANNEL_ID = 'alerts';

// unavailable: Expo Go, web, an emulator or no EAS project id. blocked: the phone will not show the prompt again.
export type PushStatus = 'on' | 'off' | 'denied' | 'blocked' | 'unavailable';

let registeredToken: string | null = null;

// True once this phone's token is with the server: its alerts then arrive as pushes, not as banners from polling.
export const isPushActive = (): boolean => registeredToken !== null;

async function canUsePush() {
  if (Platform.OS === 'web' || !Device.isDevice) return null;
  return loadNotifications();
}

function projectId(): string | null {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;
}

async function createChannels(Notifications: NonNullable<Awaited<ReturnType<typeof loadNotifications>>>) {
  if (Platform.OS !== 'android') return;
  // Android shows no permission prompt before a channel exists, and the token must come after the channels.
  await Notifications.setNotificationChannelAsync(BUDGET_CHANNEL_ID, {
    name: t('push.channelBudget'),
    importance: Notifications.AndroidImportance.HIGH,
  });
  await Notifications.setNotificationChannelAsync(ALERTS_CHANNEL_ID, {
    name: t('push.channelAlerts'),
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

// What the settings screen shows, without asking anything.
export async function getPushStatus(): Promise<PushStatus> {
  const Notifications = await canUsePush();
  if (!Notifications || !projectId()) return 'unavailable';
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return permission.canAskAgain ? 'denied' : 'blocked';
  return registeredToken ? 'on' : 'off';
}

// Gets this phone's Expo push token and gives it to the server. `ask` says whether the permission prompt may show:
// 'once' (after sign-in: only if the app never asked before) or 'now' (the user tapped the settings button).
// Never throws. In bypass mode there is no account, so the token is fetched but not sent anywhere.
export async function registerForPush(ask: 'once' | 'now'): Promise<PushStatus> {
  try {
    const Notifications = await canUsePush();
    const id = projectId();
    if (!Notifications || !id) return 'unavailable';
    presentInForeground(Notifications);
    await createChannels(Notifications);

    let permission = await Notifications.getPermissionsAsync();
    if (!permission.granted && permission.canAskAgain) {
      const askedBefore = (await AsyncStorage.getItem(ASKED_KEY).catch(() => null)) !== null;
      if (ask === 'now' || !askedBefore) {
        await AsyncStorage.setItem(ASKED_KEY, '1').catch(() => undefined);
        permission = await Notifications.requestPermissionsAsync();
      }
    }
    if (!permission.granted) return permission.canAskAgain ? 'denied' : 'blocked';

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    if (!AUTH_BYPASS) {
      await registerPushToken(token, Platform.OS === 'ios' ? 'ios' : 'android', getLanguage());
    }
    registeredToken = token;
    await AsyncStorage.setItem(TOKEN_KEY, token).catch(() => undefined);
    return 'on';
  } catch {
    // No network or the server is down: polling keeps showing alerts, and the next start tries again.
    return 'off';
  }
}

// On sign-out, while the session is still valid: the next account on this phone must not get this one's pushes.
// Never throws; a failure only means the server drops the token when another account registers it.
export async function unregisterPush(): Promise<void> {
  const token = registeredToken ?? (await AsyncStorage.getItem(TOKEN_KEY).catch(() => null));
  registeredToken = null;
  await AsyncStorage.removeItem(TOKEN_KEY).catch(() => undefined);
  if (!token || AUTH_BYPASS) return;
  await unregisterPushToken(token).catch(() => undefined);
}
