import { createApp } from './app';
import { getDb, closeDb } from './db';
import { seed } from './seed';
import { resumeAutoAdvance } from './services/orderService';
import { config } from './config';

// Initialize DB and run migrations + seed on startup
try {
  getDb();
  await seed();
  await resumeAutoAdvance();
  console.log('Database initialized and seeded');
} catch (err) {
  console.error('Database initialization failed:', err);
  process.exit(1);
}

const app = createApp();
const server = app.listen(config.port);

console.log(`🚀 Server running at http://localhost:${config.port}`);

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`Received ${signal}, shutting down...`);
  server.stop();
  closeDb();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export type App = typeof app;
