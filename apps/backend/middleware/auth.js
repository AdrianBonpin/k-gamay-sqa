'use strict';

const { randomUUID } = require('crypto');
const jwt = require('jsonwebtoken');
const { isRevoked } = require('./tokenDenylist');
const config = require('../config');
const { getDb } = require('../db');
const { HttpError } = require('../lib/asyncHandler');

const ISSUER = 'k-gamay';

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return next(new HttpError(401, 'AUTH_MISSING', 'Missing or invalid Authorization header'));
  }
  const token = match[1];
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256'],
      issuer: ISSUER,
    });
  } catch (_err) {
    return next(new HttpError(401, 'AUTH_INVALID', 'Invalid or expired token'));
  }
  if (payload.jti && isRevoked(payload.jti)) {
    return next(new HttpError(401, 'AUTH_REVOKED', 'Token has been revoked'));
  }

  // Minimal payload: look up fresh user from DB by sub.
  const db = getDb();
  const userId = Number(payload.sub);
  if (!Number.isInteger(userId) || userId <= 0) {
    return next(new HttpError(401, 'AUTH_INVALID', 'Invalid token subject'));
  }
  const row = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(userId);
  if (!row) {
    return next(new HttpError(401, 'AUTH_USER_NOT_FOUND', 'User no longer exists'));
  }
  req.user = { id: row.id, email: row.email, name: row.name, jti: payload.jti };
  return next();
}

function signToken(user) {
  const jti = randomUUID();
  // issuer option adds `iss` claim to payload automatically.
  const token = jwt.sign({ sub: String(user.id), jti }, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: config.jwtExpiresIn,
    issuer: ISSUER,
  });
  return { token, jti };
}

module.exports = { requireAuth, signToken };
