'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler, HttpError } = require('../lib/asyncHandler');
const orderService = require('../services/orderService');

const router = express.Router();

router.use(requireAuth);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { items, promoCode, delivery } = req.body || {};
    const order = orderService.createOrder({
      userId: req.user.id,
      items,
      promoCode,
      delivery,
    });
    return res.status(201).json({
      orderId: order.id,
      total: order.total,
      totalCents: order.totalCents,
      items: order.items,
      status: order.status,
      createdAt: order.createdAt,
      promoCode: order.promoCode,
      discount: order.discount,
      delivery: order.delivery,
    });
  }),
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const orders = orderService.listOrders({ userId: req.user.id });
    return res.json(orders);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const order = orderService.getOrder({ userId: req.user.id, orderId: id });
    return res.json(order);
  }),
);

router.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const status = req.body && req.body.status;
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, 'ORDER_ID_INVALID', 'Invalid order id');
    }
    const order = orderService.updateStatus({
      userId: req.user.id,
      orderId: id,
      status,
    });
    return res.json(order);
  }),
);

module.exports = router;
