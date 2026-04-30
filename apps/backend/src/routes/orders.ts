import { Elysia, t } from 'elysia';
import { auth } from '../auth';
import {
  createOrder,
  listOrders,
  getOrder,
  updateOrderStatus,
} from '../services/orderService';

// Auth guard that extracts session
const authGuard = new Elysia().derive(async ({ request, set }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    set.status = 401;
    throw new Error('AUTH_REQUIRED');
  }
  return { user: session.user };
});

export const ordersRoutes = new Elysia({ prefix: '/api/orders' })
  .use(authGuard)
  .post(
    '/',
    async ({ body, user }) => {
      return createOrder({
        userId: user.id,
        items: body.items,
        promoCode: body.promoCode,
        delivery: body.delivery,
      });
    },
    {
      body: t.Object({
        items: t.Array(
          t.Object({
            menuId: t.Number({ minimum: 1, integer: true }),
            qty: t.Number({ minimum: 1, integer: true }),
          }),
        ),
        promoCode: t.Optional(t.String()),
        delivery: t.Object({
          name: t.String({ minLength: 1 }),
          address: t.String({ minLength: 1 }),
          phone: t.String({ minLength: 1 }),
        }),
      }),
    },
  )
  .get('/', async ({ user }) => {
    return listOrders(user.id);
  })
  .get('/:id', async ({ params, user }) => {
    return getOrder(user.id, Number(params.id));
  })
  .patch(
    '/:id/status',
    async ({ params, body, user }) => {
      return updateOrderStatus(user.id, Number(params.id), body.status);
    },
    {
      body: t.Object({
        status: t.Union([
          t.Literal('pending'),
          t.Literal('in_progress'),
          t.Literal('delivered'),
        ]),
      }),
    },
  );
