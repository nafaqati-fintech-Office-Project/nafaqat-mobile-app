import { publicApi } from '@/api/http';

export type AuthResponse = {
  id: string;
  username: string;
  email: string;
  role: string;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
};

export type LoginRequest = {
  identifier: string;
  password: string;
  rememberMe: boolean;
};

export async function login(request: LoginRequest): Promise<AuthResponse> {
  const { data } = await publicApi.post<AuthResponse>('/api/auth/login', request);
  return data;
}

export async function refresh(refreshToken: string): Promise<AuthResponse> {
  const { data } = await publicApi.post<AuthResponse>('/api/auth/refresh', { refreshToken });
  return data;
}

export async function logout(refreshToken: string): Promise<void> {
  await publicApi.post('/api/auth/logout', { refreshToken });
}
