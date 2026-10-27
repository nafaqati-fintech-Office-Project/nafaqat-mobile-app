import { isAxiosError } from 'axios';

import { t } from '@/i18n';

export type ApiErrorInfo = {
  message: string | null;
  fieldErrors: Record<string, string>;
};

function readFieldErrors(data: unknown): Record<string, string> {
  if (typeof data !== 'object' || data === null || !('fieldErrors' in data)) return {};
  const raw = data.fieldErrors;
  if (typeof raw !== 'object' || raw === null) return {};
  return Object.fromEntries(
    Object.entries(raw).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
}

const general = (message: string): ApiErrorInfo => ({ message, fieldErrors: {} });

function conflictInfo(data: unknown): ApiErrorInfo {
  const message =
    typeof data === 'object' && data !== null && 'message' in data && typeof data.message === 'string'
      ? data.message.toLowerCase()
      : '';
  const text = t('errors.userExists');
  if (message.includes('username')) return { message: null, fieldErrors: { username: text } };
  if (message.includes('email')) return { message: null, fieldErrors: { email: text } };
  return general(text);
}

export function toApiErrorInfo(error: unknown): ApiErrorInfo {
  if (!isAxiosError(error)) return general(t('errors.unknown'));

  const status = error.response?.status;
  if (status === undefined) return general(t('errors.network'));

  switch (status) {
    case 400: {
      const fieldErrors = readFieldErrors(error.response?.data);
      return Object.keys(fieldErrors).length > 0
        ? { message: null, fieldErrors }
        : general(t('errors.unknown'));
    }
    case 401:
      return general(t('errors.invalidCredentials'));
    case 409:
      // "Username already exists" / "Email already exists": point at the field that clashed.
      return conflictInfo(error.response?.data);
    case 429:
      return general(t('errors.tooManyAttempts'));
    case 502:
    case 503:
    case 504:
      return general(t('errors.unavailable'));
    default:
      return general(t('errors.unknown'));
  }
}
