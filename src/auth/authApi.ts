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

export type RegisterRequest = {
  username: string;
  email: string;
  firstName: string;
  lastName?: string;
  password: string;
};

// The server answers 201 with the new user only: there are no tokens, so the caller signs in next.
export async function register(request: RegisterRequest): Promise<AuthResponse> {
  const { data } = await publicApi.post<AuthResponse>('/api/auth/register', request);
  return data;
}

// Always succeeds for a well-formed email, whether or not an account exists (no enumeration).
export async function forgotPassword(email: string): Promise<void> {
  await publicApi.post('/api/auth/forgot-password', { email });
}

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
