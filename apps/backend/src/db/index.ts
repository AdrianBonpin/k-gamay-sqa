import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { config } from '../config';
import * as schema from './schema';

function createPool() {
  return new Pool({ connectionString: config.databaseUrl });
}

let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    _pool = createPool();
    _db = drizzle(_pool, { schema });
  }
  return _db;
}

export function closeDb() {
  if (_pool) {
    _pool.end();
    _pool = null;
    _db = null;
  }
}

export { schema };
