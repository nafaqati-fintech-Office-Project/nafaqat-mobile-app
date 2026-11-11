import { Redirect } from 'expo-router';

import { SMS_TOOLS_ENABLED } from '@/config/flags';
import { SmsPermissionScreen } from '@/features/sms/SmsPermissionScreen';

export default function SmsPermissionRoute() {
  if (!SMS_TOOLS_ENABLED) return <Redirect href="/home" />;
  return <SmsPermissionScreen />;
}
