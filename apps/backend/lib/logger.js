'use strict';

const pino = require('pino');
const config = require('../config');

const options = {
  level: config.logLevel,
  base: { service: 'food-delivery-backend' },
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.passwordHash'],
    remove: true,
  },
};

let logger;
if (config.env !== 'production' && config.env !== 'test') {
  logger = pino({
    ...options,
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid,hostname,service' },
    },
  });
} else {
  logger = pino(options);
}

module.exports = logger;
