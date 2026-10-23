import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envFile = resolve(__dirname, '..', '.env.test');
if (!existsSync(envFile)) {
  throw new Error('apps/api/.env.test is missing: e2e tests need a separate test database (see .env.test.example)');
}
config({ path: envFile, override: true, quiet: true });

const databaseName = new URL(process.env.DATABASE_URL ?? 'postgresql://invalid/').pathname.replace(/^\//, '');
if (!databaseName.endsWith('_test')) {
  throw new Error(`E2E tests truncate every table; refusing to run against database "${databaseName}" (name must end with _test)`);
}
