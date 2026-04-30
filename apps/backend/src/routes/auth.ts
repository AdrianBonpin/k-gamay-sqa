import { Elysia, t } from 'elysia';
import { auth } from '../auth';
import { HttpError } from '../lib/errors';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const authRoutes = new Elysia({ prefix: '/api/auth' })
  .post(
    '/signup',
    async ({ body, set }) => {
      // Manual validation to return 400 instead of Elysia's default 422
      if (!body.email || !emailRegex.test(body.email as string)) {
        throw new HttpError(400, 'INVALID_EMAIL', 'Invalid email format');
      }
      if (!body.password || (body.password as string).length < 8) {
        throw new HttpError(400, 'INVALID_PASSWORD', 'Password must be at least 8 characters');
      }
      if (!body.name || (body.name as string).length < 1) {
        throw new HttpError(400, 'INVALID_NAME', 'Name is required');
      }
      set.status = 201;
      const result = await auth.api.signUpEmail({
        body: {
          email: body.email as string,
          password: body.password as string,
          name: body.name as string,
        },
      });
      if (!result?.user || !result?.token) {
        throw new HttpError(400, 'SIGNUP_FAILED', 'Signup failed');
      }
      return {
        token: result.token,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
        },
      };
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String(),
        name: t.String(),
      }),
    },
  )
  .post(
    '/login',
    async ({ body }) => {
      let result;
      try {
        result = await auth.api.signInEmail({
          body: {
            email: body.email as string,
            password: body.password as string,
          },
        });
      } catch {
        throw new HttpError(401, 'AUTH_INVALID_CREDENTIALS', 'Invalid credentials');
      }
      if (!result?.user || !result?.token) {
        throw new HttpError(401, 'AUTH_INVALID_CREDENTIALS', 'Invalid credentials');
      }
      return {
        token: result.token,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
        },
      };
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String(),
      }),
    },
  )
  .post('/logout', async ({ request }) => {
    await auth.api.signOut({ headers: request.headers });
    return { ok: true };
  });
