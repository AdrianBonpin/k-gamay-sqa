import { Elysia, t } from 'elysia';
import { auth } from '../auth';
import {
  createOrder,
  listOrders,
  getOrder,
  updateOrderStatus,
} from '../services/orderService';

export const ordersRoutes = new Elysia({ prefix: '/api/orders' })
  .derive(async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    return { user: session?.user ?? null };
  })
  .guard(
    {
      beforeHandle: ({ user, set }) => {
        if (!user) {
          set.status = 401;
          return { error: { code: 'AUTH_MISSING', message: 'Authentication required' } };
        }
      },
    },
    (app) =>
      app
        .post(
          '/',
          async ({ body, user }) => {
            return createOrder({
              userId: user!.id,
              items: body.items,
              promoCode: body.promoCode,
              paymentMethod: body.paymentMethod,
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
              paymentMethod: t.Optional(t.String()),
              delivery: t.Object({
                name: t.String({ minLength: 1, maxLength: 200 }),
                address: t.String({ minLength: 1, maxLength: 500 }),
                phone: t.String({
                  minLength: 7,
                  maxLength: 20,
                  pattern: '^[0-9+\\-() ]+$',
                }),
              }),
            }),
          },
        )
        .get('/', async ({ user }) => {
          return listOrders(user!.id);
        })
        .get('/:id', async ({ params, user }) => {
          return getOrder(user!.id, String(params.id));
        })
        .patch(
          '/:id/status',
          async ({ params, body, user }) => {
            return updateOrderStatus(user!.id, String(params.id), body.status);
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
        ),
  );
