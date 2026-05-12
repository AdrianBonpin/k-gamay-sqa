'use strict';

const { randomUUID } = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');

const config = require('./config');
const logger = require('./lib/logger');
const { metricsMiddleware, metricsHandler } = require('./lib/metrics');
const { httpsOnly } = require('./middleware/httpsOnly');
const { authLimiter, globalLimiter } = require('./middleware/rateLimit');
const { getDb } = require('./db');

const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const promoRoutes = require('./routes/promo');
const ratingsRoutes = require('./routes/ratings');
const manageRoutes = require('./routes/manage');

function createApp() {
  const app = express();
  app.set('trust proxy', 1);

  // Request ID (respect incoming x-request-id) + pino-http.
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const incoming = req.headers['x-request-id'];
        const id = typeof incoming === 'string' && incoming ? incoming : randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      serializers: {
        req(req) {
          return { id: req.id, method: req.method, url: req.url };
        },
        res(res) {
          return { statusCode: res.statusCode };
        },
      },
    }),
  );

  // HTTPS redirect (prod only, gated internally).
  if (config.env === 'production') {
    app.use(httpsOnly);
  }

  // Metrics.
  app.use(metricsMiddleware);

  // Helmet + strict CSP + optional HSTS.
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https://images.unsplash.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      hsts:
        config.env === 'production'
          ? { maxAge: 63072000, includeSubDomains: true, preload: true }
          : false,
    }),
  );

  // CORS.
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (config.corsOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`CORS: origin ${origin} not allowed`));
      },
    }),
  );

  app.use(express.json({ limit: config.bodyLimit }));

  app.use('/api', globalLimiter);

  // Metrics endpoint (before health for completeness, no auth).
  app.get('/metrics', metricsHandler);

  app.get('/api/health', (req, res) => {
    try {
      const db = getDb();
      db.prepare('SELECT 1 AS ok').get();
      return res.json({
        ok: true,
        db: 'ok',
        service: 'food-delivery-backend',
        uptime: process.uptime(),
      });
    } catch (err) {
      req.log && req.log.error({ err, op: 'health.check' }, 'health db error');
      return res.status(503).json({ ok: false, db: 'error' });
    }
  });

  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/signup', authLimiter);

  app.use('/api/auth', authRoutes);
  app.use('/api/menu', menuRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/promo', promoRoutes);
  app.use('/api/ratings', ratingsRoutes);

  // Management panel (password-protected, /manage) — for admin operations
  app.use('/manage', manageRoutes);

  app.use((req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Not found',
        requestId: req.id,
      },
    });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = (err && err.status) || 500;
    const code = (err && err.code) || (status >= 500 ? 'INTERNAL' : 'ERROR');
    const message = status >= 500 ? 'Internal server error' : (err && err.message) || 'Error';

    if (status >= 500 && config.env !== 'test') {
      if (req.log) req.log.error({ err, op: 'request.error' }, 'unhandled');
      else logger.error({ err, op: 'request.error' }, 'unhandled');
    }
    return res.status(status).json({
      error: {
        code,
        message,
        requestId: req.id,
      },
    });
  });

  return app;
}

module.exports = { createApp };
