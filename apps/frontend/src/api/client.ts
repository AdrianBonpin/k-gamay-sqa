import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { useAuthStore } from '@/store/authStore';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  config.headers = config.headers ?? {};
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Attach a per-request correlation ID for tracing through pino logs.
  if (!config.headers['x-request-id']) {
    config.headers['x-request-id'] = uuidv4();
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      // Do NOT logout on 401 for auth endpoints — signup/login with bad creds
      // should surface the error, not blow away existing session state.
      const url: string = error.config?.url ?? '';
      const isAuthCall = url.startsWith('/auth/') || url.startsWith('auth/');
      if (!isAuthCall) {
        const { token, logout } = useAuthStore.getState();
        if (token) logout();
      }
    }
    return Promise.reject(error);
  },
);

/**
 * Extracts a human-readable error message from an unknown error.
 * Handles three response shapes in priority order:
 *   1. New envelope: `{ error: { code, message, requestId } }`
 *   2. Legacy:       `{ error: 'message' }`
 *   3. Axios/Error fallback
 *
 * When a `requestId` is present on the new envelope, a short reference is
 * appended in parentheses to aid log correlation.
 */
export function extractError(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { error?: string | { code?: string; message?: string; requestId?: string } }
      | undefined;
    const raw = data?.error;
    if (raw && typeof raw === 'object') {
      const msg = raw.message ?? err.message ?? fallback;
      if (raw.requestId) {
        return `${msg} (ref: ${raw.requestId.slice(0, 8)})`;
      }
      return msg;
    }
    if (typeof raw === 'string') return raw;
    return err.message ?? fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
