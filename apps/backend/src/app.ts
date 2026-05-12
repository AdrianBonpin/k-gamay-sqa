import { Elysia } from 'elysia';
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
import { HttpError } from './lib/errors';
import { tryServeFrontend } from './middleware/staticFiles';

export function createApp() {
  return new Elysia()
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
    // Global rate limit for remaining API routes
    .use(globalRateLimit)
    // Health (no rate limit)
    .use(healthRoutes)
    // API routes
    .use(menuRoutes)
    .use(ordersRoutes)
    .use(promoRoutes)
    .use(ratingsRoutes)
    // Admin login (role verification)
    .use(adminAuthRoutes)   // /api/admin/login
    // Management panel
    .use(manageRoutes)      // /api/manage (admin guard applies internally)
    // Catch-all: try SPA frontend, then 404
    .all('*', async ({ path, set }) => {
      const response = await tryServeFrontend(path);
      if (response) return response;
      set.status = 404;
      return { error: { code: 'NOT_FOUND', message: 'Not found' } };
    })
    // Global error handler
    .onError(({ code, error, set }) => {
      if (error instanceof HttpError) {
        set.status = error.status;
        return { error: { code: error.code, message: error.message } };
      }
      console.error('Unhandled error:', error);
      set.status = 500;
      return { error: { code: 'INTERNAL', message: 'Internal server error' } };
    });
}
