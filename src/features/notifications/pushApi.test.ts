import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerPushToken, sendTestPush, unregisterPushToken } from './pushApi';

const http = vi.hoisted(() => ({ put: vi.fn(), delete: vi.fn(), post: vi.fn() }));
vi.mock('@/api/client', () => ({ api: http }));

const TOKEN = 'ExponentPushToken[abc123]';

beforeEach(() => {
  vi.resetAllMocks();
});

describe('pushApi', () => {
  it('registers the token in the body with the platform and the app language', async () => {
    http.put.mockResolvedValue({ status: 204 });
    await registerPushToken(TOKEN, 'android', 'ar');
    expect(http.put).toHaveBeenCalledWith('/api/notifications/push-tokens', {
      token: TOKEN,
      platform: 'android',
      language: 'ar',
    });
  });

  it('removes the token with a body, never in the URL', async () => {
    http.delete.mockResolvedValue({ status: 204 });
    await unregisterPushToken(TOKEN);
    expect(http.delete).toHaveBeenCalledWith('/api/notifications/push-tokens', { data: { token: TOKEN } });
  });

  it('reads how many phones the test push went to', async () => {
    http.post.mockResolvedValue({ data: { devices: 2, accepted: 1 } });
    await expect(sendTestPush()).resolves.toEqual({ devices: 2, accepted: 1 });
    expect(http.post).toHaveBeenCalledWith('/api/notifications/push-tokens/test');
  });

  it('rejects an answer it does not understand', async () => {
    http.post.mockResolvedValue({ data: 'oops' });
    await expect(sendTestPush()).rejects.toThrow();
  });
});
