import {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
} from '@expo-google-fonts/cairo';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { AuthProvider } from '@/auth/AuthProvider';
import { ToastHost } from '@/components/Toast';
import { CreditPromptHost } from '@/components/CreditPrompt';
import { UpgradePromptHost } from '@/components/UpgradePrompt';
import { SmsAutoSync } from '@/features/sms/SmsAutoSync';
import { LanguageProvider } from '@/i18n/LanguageProvider';

SplashScreen.preventAutoHideAsync();

function Shell() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });
  const ready = loaded || error !== null;

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  if (!ready) return null;

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        {/* Form sheets show no native header: the title is inside the screen. */}
        <Stack.Screen
          name="change-category"
          options={{ presentation: 'formSheet', sheetAllowedDetents: [0.85], sheetCornerRadius: 24 }}
        />
        <Stack.Screen
          name="goal-contribute"
          options={{ presentation: 'formSheet', sheetAllowedDetents: [0.6], sheetCornerRadius: 24 }}
        />
      </Stack>
      <SmsAutoSync />
      <ToastHost />
      <UpgradePromptHost />
      <CreditPromptHost />
    </AuthProvider>
  );
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <Shell />
    </LanguageProvider>
  );
}
