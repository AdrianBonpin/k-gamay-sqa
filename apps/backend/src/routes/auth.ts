import { Elysia, t } from 'elysia';
import { auth } from '../auth';
import { HttpError } from '../lib/errors';

export const authRoutes = new Elysia({ prefix: '/api/auth' })
  .post(
    '/signup',
    async ({ body }) => {
      const result = await auth.api.signUpEmail({
        body: {
          email: body.email,
          password: body.password,
          name: body.name,
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
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 8 }),
        name: t.String({ minLength: 1 }),
      }),
    },
  )
  .post(
    '/login',
    async ({ body }) => {
      const result = await auth.api.signInEmail({
        body: {
          email: body.email,
          password: body.password,
        },
      });
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
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 1 }),
      }),
    },
  )
  .post('/logout', async ({ request }) => {
    await auth.api.signOut({ headers: request.headers });
    return { ok: true };
  });
