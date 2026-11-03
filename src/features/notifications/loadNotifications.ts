import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');

let loaded: Promise<NotificationsModule | null> | null = null;

async function load(): Promise<NotificationsModule | null> {
  try {
    if (Platform.OS === 'android' && (await import('expo')).isRunningInExpoGo()) return null;
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

// The expo-notifications module, or null where it cannot run. Loaded on first use: importing it touches native
// modules at once, which fails (and logs a red error) in Expo Go on Android and in a development build made
// before the package was added. Without it the app works as before, only without phone banners.
export function loadNotifications(): Promise<NotificationsModule | null> {
  loaded ??= load();
  return loaded;
}
