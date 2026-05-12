import { Elysia } from 'elysia';
import { auth } from '../auth';
import { HttpError } from '../lib/errors';

/**
 * Elysia guard that requires:
 * 1. A valid Better-Auth session (user is signed in)
 * 2. The user has the 'admin' role
 *
 * Replaces the old `requireManageAuth` + `x-manage-key` approach.
 */
export const adminGuard = new Elysia().derive(async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    throw new HttpError(401, 'AUTH_REQUIRED', 'Authentication required');
  }

  const user = session.user as Record<string, unknown>;
  const roleStr: string = (user.role as string) ?? '';
  const roles = roleStr.split(',').map((r) => r.trim()).filter(Boolean);

  if (!roles.includes('admin')) {
    throw new HttpError(403, 'ADMIN_REQUIRED', 'Admin access required');
  }

  return { adminUser: session.user };
});