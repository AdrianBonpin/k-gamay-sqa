import { HttpError } from '../lib/errors';

/**
 * Elysia `beforeHandle` guard for the management panel.
 *
 * Checks the `x-manage-key` header against the `MANAGE_PASSWORD` env var.
 * No sign-in needed — just pass the header value.
 *
 * Usage:
 *   .guard({ beforeHandle: requireManageAuth }, (app) => app.get(...))
 */
export function requireManageAuth({ request }: { request: Request }): void {
  const password = process.env.MANAGE_PASSWORD;

  if (!password || typeof password !== 'string' || !password.trim()) {
    throw new HttpError(503, 'MANAGE_NOT_CONFIGURED', 'Management panel not configured');
  }

  const key = request.headers.get('x-manage-key');
  if (typeof key !== 'string' || key !== password) {
    throw new HttpError(401, 'MANAGE_UNAUTHORIZED', 'Invalid management key');
  }
}
