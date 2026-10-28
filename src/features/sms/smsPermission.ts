import { PermissionsAndroid, Platform } from 'react-native';

export type SmsPermissionStatus = 'granted' | 'denied' | 'blocked';

// Read on demand: PermissionsAndroid does not exist on web, where this file is still loaded by the router.
const permissions = () => [
  PermissionsAndroid.PERMISSIONS.READ_SMS,
  PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
];

export async function checkSmsPermission(): Promise<SmsPermissionStatus> {
  if (Platform.OS !== 'android') return 'denied';
  const results = await Promise.all(permissions().map((p) => PermissionsAndroid.check(p)));
  return results.every(Boolean) ? 'granted' : 'denied';
}

export async function requestSmsPermission(): Promise<SmsPermissionStatus> {
  if (Platform.OS !== 'android') return 'denied';
  const list = permissions();
  const results = await PermissionsAndroid.requestMultiple(list);
  const values = list.map((p) => results[p]);
  if (values.every((v) => v === PermissionsAndroid.RESULTS.GRANTED)) return 'granted';
  if (values.some((v) => v === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)) return 'blocked';
  return 'denied';
}
