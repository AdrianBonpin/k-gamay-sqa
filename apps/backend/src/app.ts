import { Elysia, ValidationError } from 'elysia';
import { cors } from '@elysiajs/cors';
import { config } from './config';
import { healthRoutes } from './routes/health';
import { authRoutes } from './routes/auth';
import { menuRoutes } from './routes/menu';
import { ordersRoutes } from './routes/orders';
import { promoRoutes } from './routes/promo';
import { ratingsRoutes } from './routes/ratings';
import { adminAuthRoutes } from './routes/admin-auth';
import { manageRoutes } from './routes/manage';
import { globalRateLimit, authRateLimit } from './middleware/rateLimit';
import { requestIdPlugin } from './middleware/requestId';
import { securityHeaders } from './middleware/securityHeaders';
import { HttpError } from './lib/errors';
import { tryServeFrontend } from './middleware/staticFiles';

export function createApp() {
  return new Elysia()
    // Global error handler (must be registered before routes to apply to all .use() plugins)
    .onError({ as: 'global' }, ({ code, error, set }) => {
      if (error instanceof HttpError) {
        set.status = error.status;
        return { error: { code: error.code, message: error.message } };
      }
      // Convert Elysia schema-validation errors (422) to 400 with a clean format
      if (error instanceof ValidationError) {
        set.status = 400;
        try {
          const detail = JSON.parse(error.message);
          const first = detail.errors?.[0];
          return {
            error: {
              code: 'VALIDATION',
              message: first?.message ?? detail.message ?? 'Validation error',
              path: first?.path ?? detail.property,
            },
          };
        } catch {
          return { error: { code: 'VALIDATION', message: error.message } };
        }
      }
      console.error('Unhandled error:', error);
      set.status = 500;
      return { error: { code: 'INTERNAL', message: 'Internal server error' } };
    })
    // Security headers (first — before anything else)
    .use(securityHeaders)
    // Request ID
    .use(requestIdPlugin)
    // CORS
    .use(
      cors({
        origin: ({ headers }) => {
          const origin = headers.get('origin');
          if (!origin) return true;
          return config.corsOrigins.includes(origin);
        },
        credentials: true,
      }),
    )
    // Rate limiting: auth endpoints first (more restrictive)
    .use(authRateLimit)
    .use(authRoutes)
    // Health (no rate limit)
    .use(healthRoutes)
    // Admin auth routes (public login + session check)
    .use(adminAuthRoutes)   // /api/admin/login, /api/admin/me
    // Management panel (adminGuard applies internally)
    .use(manageRoutes)      // /api/manage/*
    // Global rate limit for remaining API routes
    .use(globalRateLimit)
    // API routes (rate-limited)
    .use(menuRoutes)
    .use(ordersRoutes)
    .use(promoRoutes)
    .use(ratingsRoutes)
    // Catch-all: try SPA frontend, then 404
    .all('*', async ({ path, set }) => {
      const response = await tryServeFrontend(path);
      if (response) return response;
      set.status = 404;
      return { error: { code: 'NOT_FOUND', message: 'Not found' } };
    });
}
