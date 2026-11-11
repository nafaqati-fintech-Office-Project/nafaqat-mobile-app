import { router } from 'expo-router';
import { useState } from 'react';

import { toApiErrorInfo } from '@/api/errors';
import { useAuth } from '@/auth/AuthProvider';
import { showToast } from '@/components/Toast';
import { GOOGLE_WEB_CLIENT_ID } from '@/config/env';
import { AUTH_BYPASS } from '@/config/flags';
import { useLanguage } from '@/i18n/LanguageProvider';

// "Continue with Google" for both the login and the register screen: the server signs the person in, or
// creates the account the first time, so there is no difference between the two.
export function useGoogleSignIn() {
  const { t } = useLanguage();
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    if (AUTH_BYPASS) {
      // TEMP: remove when dashboard is connected to backend
      await signInWithGoogle('');
      router.replace('/home');
      return;
    }
    if (!GOOGLE_WEB_CLIENT_ID) {
      showToast(t('google.notConfigured'));
      return;
    }

    // Loaded here, not at the top: a build made before the library was added has no native module for it, and
    // importing it would break the login and register screens themselves.
    let google: typeof import('@react-native-google-signin/google-signin');
    try {
      google = await import('@react-native-google-signin/google-signin');
    } catch {
      showToast(t('google.rebuild'));
      return;
    }
    const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } = google;

    setBusy(true);
    try {
      GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
      await GoogleSignin.hasPlayServices();
      // Forget the last choice, so the account picker shows each time (people have more than one account).
      await GoogleSignin.signOut().catch(() => undefined);
      const response = await GoogleSignin.signIn();
      const idToken = isSuccessResponse(response) ? response.data.idToken : null;
      if (!idToken) return; // the person closed the picker
      await signInWithGoogle(idToken);
      router.replace('/home');
    } catch (error) {
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED || error.code === statusCodes.IN_PROGRESS) return;
        if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          showToast(t('google.playServices'));
          return;
        }
      }
      console.warn('[google-signin]', JSON.stringify(error), error);
      showToast(toApiErrorInfo(error).message ?? t('google.failed'));
    } finally {
      setBusy(false);
    }
  };

  return { busy, submit };
}
