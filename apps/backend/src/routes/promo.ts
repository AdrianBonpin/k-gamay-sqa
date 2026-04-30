import { Elysia, t } from 'elysia';
import { lookupPromo, listActivePromos } from '../services/promoService';
import { HttpError } from '../lib/errors';

export const promoRoutes = new Elysia({ prefix: '/api/promo' })
  .post(
    '/validate',
    async ({ body }) => {
      if (!body.code?.trim()) {
        throw new HttpError(400, 'PROMO_CODE_REQUIRED', 'Promo code is required');
      }
      const promo = await lookupPromo(body.code);
      if (!promo) {
        return { valid: false, discount: 0, message: 'Invalid or expired promo code' };
      }
      return {
        valid: true,
        discount: promo.discount,
        code: promo.code,
        message: promo.description,
      };
    },
    {
      body: t.Object({ code: t.String() }),
    },
  )
  .get('/codes', async () => {
    return listActivePromos();
  });
