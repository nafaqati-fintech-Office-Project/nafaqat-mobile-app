import { isAxiosError } from 'axios';

// One line saying why a request failed, for developers (shown only in dev builds). It never includes response bodies
// beyond the gateway's short error code, so no user data can end up on screen or in a log.
export function describeFailure(error: unknown): string {
  if (!isAxiosError(error)) return error instanceof Error ? error.message : 'unknown error';
  const where = `${(error.config?.method ?? 'get').toUpperCase()} ${error.config?.url ?? ''}`.trim();
  if (!error.response) return `no response (${error.code ?? 'network'}) ${where}`;
  const data: unknown = error.response.data;
  const code = typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string' ? data.error : '';
  return `${error.response.status} ${code} ${where}`.replace(/\s+/g, ' ').trim();
}
