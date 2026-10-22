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
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
      <ToastHost />
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
