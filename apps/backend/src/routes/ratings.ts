import { Elysia, t } from 'elysia';
import { auth } from '../auth';
import {
  upsertRating,
  listRatingsForItem,
  getRatingSummary,
  getMyRating,
  getTotalRatingsCount,
} from '../services/ratingService';

export const ratingsRoutes = new Elysia({ prefix: '/api/ratings' })
  .derive(async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    return { user: session?.user ?? null };
  })
  // Public routes
  .get('/summary', async () => {
    const total = await getTotalRatingsCount();
    return { total };
  })
  .get('/:menuId', async ({ params }) => {
    const menuId = Number(params.menuId);
    const summary = await getRatingSummary(menuId);
    const ratings = await listRatingsForItem(menuId);
    return { summary, ratings };
  })
  // Protected routes
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
            const rating = await upsertRating({
              userId: user!.id,
              menuId: body.menuId,
              stars: body.stars,
              review: body.review,
            });
            return { rating };
          },
          {
            body: t.Object({
              menuId: t.Number({ minimum: 1, integer: true }),
              stars: t.Number({ minimum: 1, maximum: 5, integer: true }),
              review: t.Optional(t.String({ maxLength: 500 })),
            }),
          },
        )
        .get('/:menuId/mine', async ({ params, user }) => {
          const menuId = Number(params.menuId);
          const rating = await getMyRating(user!.id, menuId);
          return { rating };
        }),
  );
