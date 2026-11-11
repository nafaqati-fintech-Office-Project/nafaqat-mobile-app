import { Redirect } from 'expo-router';

import { SMS_TOOLS_ENABLED } from '@/config/flags';
import { SmsDebugScreen } from '@/features/sms/SmsDebugScreen';

export default function SmsDebugRoute() {
  if (!SMS_TOOLS_ENABLED) return <Redirect href="/home" />;
  return <SmsDebugScreen />;
}
