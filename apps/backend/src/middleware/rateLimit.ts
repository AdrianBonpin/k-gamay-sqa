import { Elysia } from 'elysia';
import { config } from '../config';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

function createRateLimitStore() {
  const store = new Map<string, RateLimitEntry>();

  // Clean up expired entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, 5 * 60_000).unref();

  return {
    check(key: string, max: number, windowMs: number): boolean {
      const now = Date.now();
      let entry = store.get(key);
      if (!entry || now > entry.resetAt) {
        entry = { count: 0, resetAt: now + windowMs };
        store.set(key, entry);
      }
      if (entry.count >= max) return false;
      entry.count++;
      return true;
    },
  };
}

const store = createRateLimitStore();

export function rateLimitPlugin(opts: { max: number; windowMs: number }) {
  const max = config.isTest ? 100000 : opts.max;
  const windowMs = opts.windowMs;

  return new Elysia().onBeforeHandle(({ request, set }) => {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    if (!store.check(ip, max, windowMs)) {
      set.status = 429;
      return { error: { code: 'RATE_LIMITED', message: 'Too many requests, please slow down' } };
    }
  });
}

export const authRateLimit = rateLimitPlugin({ max: 10, windowMs: 15 * 60 * 1000 });
export const globalRateLimit = rateLimitPlugin({ max: 300, windowMs: 15 * 60 * 1000 });
