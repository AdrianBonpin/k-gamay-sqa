import { Elysia, t } from 'elysia';
import { auth } from '../auth';
import {
  upsertRating,
  listRatingsForItem,
  getRatingSummary,
  getMyRating,
  getTotalRatingsCount,
} from '../services/ratingService';

const authGuard = new Elysia().derive(async ({ request, set }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    set.status = 401;
    throw new Error('AUTH_REQUIRED');
  }
  return { user: session.user };
});

export const ratingsRoutes = new Elysia({ prefix: '/api/ratings' })
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
  .use(authGuard)
  .post(
    '/',
    async ({ body, user }) => {
      const rating = await upsertRating({
        userId: user.id,
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
    const rating = await getMyRating(user.id, menuId);
    return { rating };
  });
