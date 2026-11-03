import { api } from '@/api/client';
import { num, obj } from '@/api/parse';

const BASE = '/api/notifications/push-tokens';

export type PushPlatform = 'ios' | 'android';

// The token goes in the body, never the URL, so it stays out of access logs. language picks the push texts' language.
export async function registerPushToken(token: string, platform: PushPlatform, language: string): Promise<void> {
  await api.put(BASE, { token, platform, language });
}

// The server answers 204 also for a token it no longer has, so sign-out can always call it.
export async function unregisterPushToken(token: string): Promise<void> {
  await api.delete(BASE, { data: { token } });
}

// Sends a test push to every phone of the signed-in user. accepted = pushes Expo took (not yet delivered).
export async function sendTestPush(): Promise<{ devices: number; accepted: number }> {
  const { data } = await api.post(`${BASE}/test`);
  const body = obj(data);
  return { devices: num(body.devices), accepted: num(body.accepted) };
}
