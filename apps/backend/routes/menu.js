const express = require('express');
const { getDb } = require('../db');
const { asyncHandler } = require('../lib/asyncHandler');
const ratingService = require('../services/ratingService');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const db = getDb();
    const items = db
      .prepare(
        'SELECT id, name, description, price, imageUrl, category FROM menu_items ORDER BY category, id',
      )
      .all();
    const ids = items.map((it) => it.id);
    const summaries = ratingService.getSummariesForMenuIds(ids);
    const enriched = items.map((it) => ({
      ...it,
      rating: summaries.get(it.id) || { menuId: it.id, average: 0, count: 0 },
    }));
    return res.json(enriched);
  }),
);

module.exports = router;
