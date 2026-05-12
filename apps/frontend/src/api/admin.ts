import axios from 'axios';
import { useAdminStore } from '@/store/adminStore';

export interface AdminLoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

const adminApi = axios.create({
  baseURL: '',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

adminApi.interceptors.request.use((config) => {
  const token = useAdminStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function adminLogin(
  email: string,
  password: string,
): Promise<AdminLoginResponse> {
  const { data } = await adminApi.post('/api/admin/login', { email, password });
  return data;
}

/** Check if the current session cookie belongs to an admin. */
export async function getAdminMe(): Promise<AdminLoginResponse> {
  const { data } = await adminApi.get('/api/admin/me');
  return data;
}

export { adminApi };