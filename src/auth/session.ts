import { isAxiosError } from 'axios';

import * as authApi from './authApi';
import { emitSessionExpired } from './events';
import {
  clearTokens,
  getRefreshToken,
  getRememberMe,
  setAccessToken,
  setRefreshToken,
} from './tokenStore';

const REFRESH_LEAD_SECONDS = 60;
const MIN_DELAY_SECONDS = 5;
const REJECTION_STATUSES = [400, 401, 403];

let inflight: Promise<authApi.AuthResponse> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

function cancelProactiveRefresh() {
  if (timer) clearTimeout(timer);
  timer = null;
}

function scheduleProactiveRefresh(expiresInSeconds: number) {
  cancelProactiveRefresh();
  const delay = Math.max(expiresInSeconds - REFRESH_LEAD_SECONDS, MIN_DELAY_SECONDS) * 1000;
  timer = setTimeout(() => {
    refreshSession().catch(() => undefined);
  }, delay);
}

export async function startSession(auth: authApi.AuthResponse, rememberMe: boolean) {
  setAccessToken(auth.accessToken);
  await setRefreshToken(auth.refreshToken, rememberMe);
  scheduleProactiveRefresh(auth.expiresIn);
}

export async function endSession() {
  cancelProactiveRefresh();
  await clearTokens();
}

async function expire(notify: boolean) {
  await endSession();
  if (notify) emitSessionExpired();
}

async function runRefresh(notify: boolean): Promise<authApi.AuthResponse> {
  const token = getRefreshToken();
  if (!token) {
    await expire(notify);
    throw new Error('No refresh token');
  }
  try {
    const auth = await authApi.refresh(token);
    // The server rotates refresh tokens: the new one must replace the old one right away.
    await startSession(auth, getRememberMe());
    return auth;
  } catch (error) {
    const status = isAxiosError(error) ? error.response?.status : undefined;
    if (status !== undefined && REJECTION_STATUSES.includes(status)) await expire(notify);
    throw error;
  }
}

// Single-flight: concurrent callers share one request.
export function refreshSession(notifyOnExpiry = true): Promise<authApi.AuthResponse> {
  inflight ??= runRefresh(notifyOnExpiry).finally(() => {
    inflight = null;
  });
  return inflight;
}
