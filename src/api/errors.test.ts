import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it } from 'vitest';

import { toApiErrorInfo } from './errors';
import { t } from '@/i18n';

const failure = (status: number | undefined, data?: unknown) =>
  new AxiosError(
    'failed',
    undefined,
    {} as InternalAxiosRequestConfig,
    {},
    status === undefined
      ? undefined
      : { status, data, statusText: '', headers: {}, config: {} as InternalAxiosRequestConfig },
  );

describe('toApiErrorInfo', () => {
  it('reports a network problem when there is no response', () => {
    expect(toApiErrorInfo(failure(undefined))).toEqual({ message: t('errors.network'), fieldErrors: {} });
  });

  it('maps 401 to invalid credentials (also what a locked account looks like)', () => {
    expect(toApiErrorInfo(failure(401)).message).toBe(t('errors.invalidCredentials'));
  });

  it('passes server field errors through on 400', () => {
    const info = toApiErrorInfo(failure(400, { fieldErrors: { username: 'must be 3-50 characters' } }));
    expect(info).toEqual({ message: null, fieldErrors: { username: 'must be 3-50 characters' } });
  });

  it('points a 409 at the field that clashed', () => {
    expect(toApiErrorInfo(failure(409, { message: 'Username already exists' })).fieldErrors).toEqual({
      username: t('errors.userExists'),
    });
    expect(toApiErrorInfo(failure(409, { message: 'Email already exists' })).fieldErrors).toEqual({
      email: t('errors.userExists'),
    });
    expect(toApiErrorInfo(failure(409, {}))).toEqual({ message: t('errors.userExists'), fieldErrors: {} });
  });

  it('maps 429 and gateway errors', () => {
    expect(toApiErrorInfo(failure(429)).message).toBe(t('errors.tooManyAttempts'));
    for (const status of [502, 503, 504]) {
      expect(toApiErrorInfo(failure(status)).message).toBe(t('errors.unavailable'));
    }
  });

  it('falls back to a generic message', () => {
    expect(toApiErrorInfo(new Error('x')).message).toBe(t('errors.unknown'));
    expect(toApiErrorInfo(failure(500)).message).toBe(t('errors.unknown'));
  });
});
