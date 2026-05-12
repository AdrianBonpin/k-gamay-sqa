import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { useAuthStore } from '@/store/authStore';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

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
      const { token, logout } = useAuthStore.getState();
      if (token) logout();
    }
    return Promise.reject(error);
  },
);

function friendlyServerMessage(raw: string, status: number | undefined): string | null {
  const m = raw.toLowerCase();
  if (m.includes('invalid credentials') || m.includes('invalid email or password')) {
    return 'Wrong email or password.';
  }
  if (m.includes('invalid email')) return 'That email address doesn’t look right.';
  if (m.includes('password must be')) return raw;
  if (m.includes('signup failed') || m.includes('user already exists') || m.includes('email already')) {
    return 'An account with that email already exists. Try signing in instead.';
  }
  if (m.includes('rate') && m.includes('limit')) return 'Too many attempts. Please wait a minute and try again.';
  if (status === 404) return 'We couldn’t find what you’re looking for.';
  if (status === 403) return 'You don’t have permission to do that.';
  if (status === 500) return 'Something went wrong on our end. Please try again.';
  return null;
}

/**
 * Extracts a human-readable error message from an unknown error.
 * Maps known server errors and HTTP statuses to friendly strings.
 */
export function extractError(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const data = err.response?.data;

    if (err.code === 'ERR_NETWORK' || (!err.response && err.message === 'Network Error')) {
      return 'Couldn’t reach the server. Please check your connection and try again.';
    }

    let serverMsg: string | undefined;
    let requestId: string | undefined;

    if (typeof data === 'string' && data.trim()) {
      serverMsg = data.trim();
    } else if (data && typeof data === 'object') {
      const env = data as { error?: string | { code?: string; message?: string; requestId?: string } };
      const raw = env.error;
      if (raw && typeof raw === 'object') {
        serverMsg = raw.message;
        requestId = raw.requestId;
      } else if (typeof raw === 'string') {
        serverMsg = raw;
      }
    }

    if (serverMsg) {
      const friendly = friendlyServerMessage(serverMsg, status) ?? serverMsg;
      return requestId ? `${friendly} (ref: ${requestId.slice(0, 8)})` : friendly;
    }

    if (status === 401) return 'Wrong email or password.';
    if (status === 429) return 'Too many attempts. Please wait a minute and try again.';
    if (status && status >= 500) return 'Something went wrong on our end. Please try again.';

    return err.message ?? fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
