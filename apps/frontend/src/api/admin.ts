import axios from 'axios';
import { useAdminStore } from '@/store/adminStore';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AdminLoginResponse {
  token: string;
  user: AdminUser;
}

const adminApi = axios.create({
  baseURL: '',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// 401/403 response interceptor — clear admin state and redirect to login
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      useAdminStore.getState().logout();
      // Avoid redirect loops: only redirect if not already on login page
      if (window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  },
);

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