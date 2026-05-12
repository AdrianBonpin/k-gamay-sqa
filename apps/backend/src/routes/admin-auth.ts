import { Elysia, t } from 'elysia';
import { auth } from '../auth';
import { HttpError } from '../lib/errors';

export const adminAuthRoutes = new Elysia({ prefix: '/api/admin' })
  .post(
    '/login',
    async ({ body, set }) => {
      let result;
      try {
        result = await auth.api.signInEmail({
          body: {
            email: body.email as string,
            password: body.password as string,
          },
          asResponse: true,
        });
      } catch {
        throw new HttpError(401, 'AUTH_INVALID_CREDENTIALS', 'Invalid credentials');
      }

      const setCookie = result.headers.get('set-cookie');
      if (setCookie) {
        set.headers['set-cookie'] = setCookie;
      }

      const json = await result.json();

      // Verify the authenticated user has admin role
      const user = json.user as Record<string, unknown> | undefined;
      const roleStr: string = (user?.role as string) ?? '';
      const roles = roleStr.split(',').map((r) => r.trim()).filter(Boolean);

      if (!roles.includes('admin')) {
        // Sign them out immediately — not an admin
        await auth.api.signOut({ headers: new Headers({ cookie: setCookie ?? '' }) });
        throw new HttpError(403, 'NOT_ADMIN', 'This account does not have admin access');
      }

      return {
        token: json.token,
        user: {
          id: user?.id,
          email: user?.email,
          name: user?.name,
          role: user?.role,
        },
      };
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String(),
      }),
    },
  );