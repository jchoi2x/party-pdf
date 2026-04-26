import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;

const cache = new Map<string, DrizzleClient>();

function getConnectionString(env: Pick<Env, 'HYPERDRIVE'>): string {
  const connectionString = env.HYPERDRIVE?.connectionString;
  if (!connectionString) {
    throw new Error('Missing Hyperdrive connection string.');
  }
  return connectionString;
}

export function getDb(env: Pick<Env, 'HYPERDRIVE'>): DrizzleClient {
  const connectionString = getConnectionString(env);
  const cached = cache.get(connectionString);
  if (cached) {
    return cached;
  }

  const sql = postgres(connectionString, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

  const db = drizzle(sql, { schema, casing: 'snake_case' });
  cache.set(connectionString, db);
  return db;
}
