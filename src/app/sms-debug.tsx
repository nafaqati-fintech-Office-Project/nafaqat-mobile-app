import { Redirect } from 'expo-router';

import { SmsDebugScreen } from '@/features/sms/SmsDebugScreen';

export default function SmsDebugRoute() {
  if (!__DEV__) return <Redirect href="/home" />;
  return <SmsDebugScreen />;
}
