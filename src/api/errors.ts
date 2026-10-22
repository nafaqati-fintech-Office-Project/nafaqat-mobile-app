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
