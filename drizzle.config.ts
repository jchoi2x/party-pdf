import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import { readFileSync } from 'node:fs';

config({ path: '.dev.vars' });

function readWranglerLocalConnectionString(): string | undefined {
  try {
    const wranglerConfig = readFileSync('wrangler.jsonc', 'utf8');
    const match = wranglerConfig.match(/"localConnectionString"\s*:\s*"([^"]+)"/);
    return match?.[1];
  } catch {
    return undefined;
  }
}

const dbUrl =
  process.env.DATABASE_URL ??
  process.env.HYPERDRIVE_LOCAL_CONNECTION_STRING ??
  process.env.HYPERDRIVE_CONNECTION_STRING ??
  readWranglerLocalConnectionString();

if (!dbUrl) {
  throw new Error(
    'Missing DB connection string. Set DATABASE_URL, HYPERDRIVE_LOCAL_CONNECTION_STRING, or HYPERDRIVE_CONNECTION_STRING.',
  );
}

export default defineConfig({
  out: './drizzle',
  schema: './src/server/lib/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: dbUrl,
  },
  strict: true,
  verbose: true,
});
