import 'dotenv/config';

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = process.env.E2E_LOG_LEVEL ?? 'silent';

if (!process.env.DATABASE_URL_TEST) {
  throw new Error('DATABASE_URL_TEST must be set for e2e tests');
}
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
