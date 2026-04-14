'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler, HttpError } = require('../lib/asyncHandler');
const ratingService = require('../services/ratingService');

const router = express.Router();

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { menuId, stars, review } = req.body || {};
    const rating = ratingService.upsertRating({
      userId: req.user.id,
      menuId,
      stars,
      review,
    });
    return res.json({ rating });
  }),
);

router.get(
  '/summary',
  asyncHandler(async (_req, res) => {
    const total = ratingService.getTotalRatingsCount();
    return res.json({ total });
  }),
);

router.get(
  '/:menuId',
  asyncHandler(async (req, res) => {
    const menuId = Number(req.params.menuId);
    if (!Number.isInteger(menuId) || menuId <= 0) {
      throw new HttpError(400, 'VALIDATION', 'Invalid menuId');
    }
    const summary = ratingService.getSummary(menuId);
    const ratings = ratingService.listRatingsForItem(menuId, {});
    return res.json({ summary, ratings });
  }),
);

router.get(
  '/:menuId/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const menuId = Number(req.params.menuId);
    if (!Number.isInteger(menuId) || menuId <= 0) {
      throw new HttpError(400, 'VALIDATION', 'Invalid menuId');
    }
    const rating = ratingService.getMyRating({ userId: req.user.id, menuId });
    return res.json({ rating });
  }),
);

module.exports = router;
