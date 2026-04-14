'use strict';

const express = require('express');
const { asyncHandler, HttpError } = require('../lib/asyncHandler');
const { lookupPromo, listActivePromos } = require('../services/promoService');

const router = express.Router();

router.post(
  '/validate',
  asyncHandler(async (req, res) => {
    const { code } = req.body || {};
    if (typeof code !== 'string' || !code.trim()) {
      throw new HttpError(400, 'PROMO_CODE_REQUIRED', 'Promo code is required');
    }
    // Shape-only lookup here — per-user rules are enforced at order creation.
    const promo = lookupPromo(code);
    if (!promo) {
      return res.json({ valid: false, discount: 0, message: 'Invalid or expired promo code' });
    }
    return res.json({
      valid: true,
      discount: promo.discount,
      code: promo.code,
      message: promo.description,
    });
  }),
);

router.get(
  '/codes',
  asyncHandler(async (req, res) => {
    return res.json(listActivePromos());
  }),
);

module.exports = router;
