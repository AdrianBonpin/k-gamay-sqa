'use strict';

// Shared test setup helpers
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret-dont-use-in-prod';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.LOG_LEVEL = 'silent';

function freshApp() {
  const modulePaths = [
    '../config',
    '../app',
    '../db',
    '../server',
    '../lib/logger',
    // NOTE: do not clear '../lib/metrics' — prom-client registry must persist
    // across freshApp() calls to avoid duplicate-metric registration errors.
    '../routes/auth',
    '../routes/menu',
    '../routes/orders',
    '../routes/promo',
    '../routes/ratings',
    '../services/authService',
    '../services/orderService',
    '../services/promoService',
    '../services/ratingService',
    '../middleware/tokenDenylist',
    '../middleware/auth',
    '../middleware/rateLimit',
    '../middleware/httpsOnly',
  ];
  for (const p of modulePaths) {
    try {
      delete require.cache[require.resolve(p)];
    } catch (_) {
      /* not loaded */
    }
  }
  const { createApp } = require('../app');
  const { getDb, resetDb } = require('../db');
  resetDb();
  const app = createApp();
  getDb(); // initialize
  return app;
}

module.exports = { freshApp };
