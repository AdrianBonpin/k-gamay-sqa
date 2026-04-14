'use strict';

require('dotenv').config();

function parseList(raw) {
  if (!raw) return [];
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseBool(v, dflt = false) {
  if (v === undefined || v === null || v === '') return dflt;
  return /^(1|true|yes|on)$/i.test(String(v));
}

function buildConfig() {
  const env = process.env.NODE_ENV || 'development';
  const isProd = env === 'production';

  let jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    if (isProd) {
      // In production, require it.
      throw new Error('[config] JWT_SECRET must be set in production.');
    }
    jwtSecret = 'dev-only-insecure-secret-change-me';
  }

  const port = Number(process.env.PORT) || 4000;
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`[config] Invalid PORT: ${process.env.PORT}`);
  }

  const bcryptCost = Number(process.env.BCRYPT_COST) || 10;
  if (!Number.isInteger(bcryptCost) || bcryptCost < 4 || bcryptCost > 15) {
    throw new Error(`[config] Invalid BCRYPT_COST: ${process.env.BCRYPT_COST}`);
  }

  const corsOrigins = parseList(
    process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:4173',
  );

  return {
    env,
    isProd,
    port,
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    bcryptCost,
    bodyLimit: process.env.BODY_LIMIT || '20kb',
    corsOrigins,
    autoAdvanceOrders: parseBool(process.env.AUTO_ADVANCE_ORDERS, false),
    logLevel: process.env.LOG_LEVEL || (env === 'test' ? 'silent' : isProd ? 'info' : 'debug'),
  };
}

const config = buildConfig();

module.exports = config;
module.exports.buildConfig = buildConfig;
