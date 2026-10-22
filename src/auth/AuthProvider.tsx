import { router } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import * as authApi from './authApi';
import { onSessionExpired } from './events';
import { MOCK_USER } from './mockUser';
import { endSession, refreshSession, startSession } from './session';
import { getRefreshToken, loadPersistedTokens } from './tokenStore';
import { showToast } from '@/components/Toast';
import { AUTH_BYPASS } from '@/config/flags';
import { t } from '@/i18n';

export type AuthUser = Pick<authApi.AuthResponse, 'id' | 'username' | 'email' | 'role'> & {
  firstName?: string;
};
type Status = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  user: AuthUser | null;
  status: Status;
  signIn: (credentials: authApi.LoginRequest) => Promise<void>;
  signOut: () => Promise<void>;
  restoreSession: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const toUser = ({ id, username, email, role }: authApi.AuthResponse): AuthUser => ({
  id,
  username,
  email,
  role,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(
    () =>
      onSessionExpired(() => {
        setUser(null);
        setStatus('unauthenticated');
        showToast(t('errors.sessionExpired'));
        router.replace('/login');
      }),
    [],
  );

  const signIn = useCallback(async (credentials: authApi.LoginRequest) => {
    if (AUTH_BYPASS) {
      // TEMP: remove when dashboard is connected to backend
      setUser(MOCK_USER);
      setStatus('authenticated');
      return;
    }
    const auth = await authApi.login(credentials);
    await startSession(auth, credentials.rememberMe);
    setUser(toUser(auth));
    setStatus('authenticated');
  }, []);

  const signOut = useCallback(async () => {
    if (AUTH_BYPASS) {
      // TEMP: remove when dashboard is connected to backend
      setUser(null);
      setStatus('unauthenticated');
      return;
    }
    const token = getRefreshToken();
    await endSession();
    setUser(null);
    setStatus('unauthenticated');
    if (token) authApi.logout(token).catch(() => undefined);
  }, []);

  const restoreSession = useCallback(async () => {
    if (AUTH_BYPASS) {
      // TEMP: remove when dashboard is connected to backend
      setStatus('unauthenticated');
      return false;
    }
    await loadPersistedTokens();
    if (!getRefreshToken()) {
      setStatus('unauthenticated');
      return false;
    }
    try {
      setUser(toUser(await refreshSession(false)));
      setStatus('authenticated');
      return true;
    } catch {
      setStatus('unauthenticated');
      return false;
    }
  }, []);

  const value = useMemo(
    () => ({ user, status, signIn, signOut, restoreSession }),
    [user, status, signIn, signOut, restoreSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
