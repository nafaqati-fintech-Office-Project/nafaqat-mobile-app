import { beforeEach, describe, expect, it, vi } from 'vitest';

import { forgotPassword, login, logout, refresh, register } from './authApi';

const post = vi.hoisted(() => vi.fn());
vi.mock('@/api/http', () => ({ publicApi: { post } }));

const auth = {
  id: 'u1',
  username: 'ali',
  email: 'ali@example.com',
  role: 'USER',
  accessToken: 'a',
  refreshToken: 'r',
  tokenType: 'Bearer',
  expiresIn: 900,
};

beforeEach(() => {
  post.mockReset();
});

describe('authApi', () => {
  it('registers through the gateway auth route and returns the user', async () => {
    post.mockResolvedValue({ data: { ...auth, accessToken: undefined, refreshToken: undefined } });
    const request = { username: 'ali', email: 'ali@example.com', firstName: 'Ali', password: 'Passw0rd!' };
    const result = await register(request);
    expect(post).toHaveBeenCalledWith('/api/auth/register', request);
    expect(result.username).toBe('ali');
  });

  it('logs in with the identifier, password and rememberMe flag', async () => {
    post.mockResolvedValue({ data: auth });
    const request = { identifier: 'ali', password: 'Passw0rd!', rememberMe: true };
    expect(await login(request)).toEqual(auth);
    expect(post).toHaveBeenCalledWith('/api/auth/login', request);
  });

  it('refreshes and logs out with the refresh token body', async () => {
    post.mockResolvedValue({ data: auth });
    await refresh('r1');
    expect(post).toHaveBeenCalledWith('/api/auth/refresh', { refreshToken: 'r1' });
    await logout('r1');
    expect(post).toHaveBeenCalledWith('/api/auth/logout', { refreshToken: 'r1' });
  });

  it('requests a password reset by email', async () => {
    post.mockResolvedValue({ data: { message: 'ok' } });
    await forgotPassword('ali@example.com');
    expect(post).toHaveBeenCalledWith('/api/auth/forgot-password', { email: 'ali@example.com' });
  });
});
