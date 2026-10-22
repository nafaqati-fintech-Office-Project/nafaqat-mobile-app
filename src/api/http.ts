import { create } from 'axios';

import { getLanguage } from '@/i18n';

const TIMEOUT_MS = 30_000;

export function createHttp() {
  const instance = create({
    baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
    timeout: TIMEOUT_MS,
    headers: { Accept: 'application/json' },
  });
  instance.interceptors.request.use((config) => {
    config.headers.set('Accept-Language', getLanguage());
    return config;
  });
  return instance;
}

// No auth interceptors: used by the auth endpoints themselves.
export const publicApi = createHttp();
