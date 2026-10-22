import * as SecureStore from 'expo-secure-store';

const REFRESH_KEY = 'refresh_token';
const REMEMBER_KEY = 'remember_me';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let rememberMe = false;

export const getAccessToken = () => accessToken;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getRefreshToken = () => refreshToken;
export const getRememberMe = () => rememberMe;

async function persist(token: string | null, remember: boolean): Promise<void> {
  try {
    if (token && remember) {
      await SecureStore.setItemAsync(REFRESH_KEY, token);
      await SecureStore.setItemAsync(REMEMBER_KEY, 'true');
    } else {
      await SecureStore.deleteItemAsync(REFRESH_KEY);
      await SecureStore.deleteItemAsync(REMEMBER_KEY);
    }
  } catch {
    // Non-fatal: the in-memory session still works until the app is closed.
  }
}

// The in-memory value is updated first so a rotated token is never lost to a slow write.
export async function setRefreshToken(token: string, remember: boolean): Promise<void> {
  refreshToken = token;
  rememberMe = remember;
  await persist(token, remember);
}

export async function clearTokens(): Promise<void> {
  accessToken = null;
  refreshToken = null;
  rememberMe = false;
  await persist(null, false);
}

export async function loadPersistedTokens(): Promise<void> {
  try {
    const [token, remember] = await Promise.all([
      SecureStore.getItemAsync(REFRESH_KEY),
      SecureStore.getItemAsync(REMEMBER_KEY),
    ]);
    if (token && remember === 'true') {
      refreshToken = token;
      rememberMe = true;
    }
  } catch {
    // Unreadable store: treat as no saved session.
  }
}
