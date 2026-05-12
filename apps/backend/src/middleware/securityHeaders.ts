import { Elysia } from 'elysia';

const isProduction = process.env.NODE_ENV === 'production';

export const securityHeaders = new Elysia().onRequest(({ set }) => {
  set.headers['X-Content-Type-Options'] = 'nosniff';
  set.headers['X-Frame-Options'] = 'DENY';
  set.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
  set.headers['X-DNS-Prefetch-Control'] = 'off';
  set.headers['Permissions-Policy'] =
    'camera=(), microphone=(), geolocation=(), interest-cohort=()';

  if (isProduction) {
    set.headers['Strict-Transport-Security'] =
      'max-age=63072000; includeSubDomains; preload';
  }
});