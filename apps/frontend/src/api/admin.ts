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

export { adminApi };