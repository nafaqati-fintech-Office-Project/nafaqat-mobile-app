import { isAxiosError } from 'axios';

import { createHttp } from './http';
import { refreshSession } from '@/auth/session';
import { getAccessToken } from '@/auth/tokenStore';

declare module 'axios' {
  interface AxiosRequestConfig {
    retried?: boolean;
  }
}

export const api = createHttp();

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

api.interceptors.response.use(undefined, async (error: unknown) => {
  if (!isAxiosError(error) || error.response?.status !== 401) throw error;
  const original = error.config;
  if (!original || original.retried) throw error;

  original.retried = true;
  try {
    await refreshSession();
  } catch {
    throw error;
  }
  return api(original);
});
