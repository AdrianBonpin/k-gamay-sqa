import { api } from './client';
import type { AuthResponse, SignupResponse } from '@/types';

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
  return data;
}

export async function signup(
  email: string,
  password: string,
  name: string,
): Promise<SignupResponse> {
  const { data } = await api.post<SignupResponse>('/auth/signup', { email, password, name });
  return data;
}

export async function logoutApi(): Promise<void> {
  await api.post('/auth/logout');
}
