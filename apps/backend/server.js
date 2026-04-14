'use strict';

const config = require('./config');
const logger = require('./lib/logger');
const { createApp } = require('./app');
const { getDb, closeDb } = require('./db');
const { cancelAllAutoAdvance } = require('./services/orderService');

const app = createApp();

if (require.main === module) {
  getDb();
  const server = app.listen(config.port, () => {
    logger.info(
      { op: 'server.listen', port: config.port },
      `listening on http://localhost:${config.port}`,
    );
  });

  const shutdown = (signal) => {
    logger.info({ op: 'server.shutdown', signal }, 'shutting down');
    cancelAllAutoAdvance();
    server.close(() => {
      closeDb();
      process.exit(0);
    });
    setTimeout(() => {
      closeDb();
      process.exit(0);
    }, 5000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

module.exports = app;
