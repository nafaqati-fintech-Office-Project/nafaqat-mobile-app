import { Redirect } from 'expo-router';

import { SmsPermissionScreen } from '@/features/sms/SmsPermissionScreen';

export default function SmsPermissionRoute() {
  if (!__DEV__) return <Redirect href="/home" />;
  return <SmsPermissionScreen />;
}
