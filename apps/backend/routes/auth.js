'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../lib/asyncHandler');
const authService = require('../services/authService');

const router = express.Router();

router.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const { email, password, name } = req.body || {};
    const result = await authService.signup({ email, password, name });
    return res.status(201).json(result.response);
  }),
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    const result = await authService.login({ email, password });
    return res.json(result);
  }),
);

router.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = authService.logout({ jti: req.user && req.user.jti });
    return res.json(result);
  }),
);

module.exports = router;
