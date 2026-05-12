'use strict';

const { HttpError } = require('../lib/asyncHandler');

/**
 * Simple server-side password auth for the management panel.
 * Checks x-manage-key header against MANAGE_PASSWORD env var.
 * No sign-in needed — just pass the header.
 */
function requireManageAuth(req, res, next) {
  const password = process.env.MANAGE_PASSWORD;

  // If no password is configured, deny all access.
  if (!password || typeof password !== 'string' || !password.trim()) {
    return next(
      new HttpError(503, 'MANAGE_NOT_CONFIGURED', 'Management panel not configured'),
    );
  }

  const key = req.headers['x-manage-key'];
  if (typeof key !== 'string' || key !== password) {
    return next(new HttpError(401, 'MANAGE_UNAUTHORIZED', 'Invalid management key'));
  }

  return next();
}

module.exports = { requireManageAuth };
