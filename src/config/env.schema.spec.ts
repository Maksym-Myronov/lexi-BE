import { validateEnv } from './env.schema.js';

const valid = {
  DATABASE_URL: 'postgresql://lexi:lexi@localhost:5433/lexi_dev',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  ANTHROPIC_API_KEY: 'sk-ant-test',
  CORS_ORIGIN: 'http://localhost:3000',
  ADMIN_EMAIL: 'admin@example.com',
  ADMIN_PASSWORD: 'password123',
};

describe('validateEnv', () => {
  it('accepts a valid env and applies defaults', () => {
    const env = validateEnv(valid);
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(4000);
    expect(env.LOG_LEVEL).toBe('info');
  });

  it('turns PORT from a string into a number', () => {
    expect(validateEnv({ ...valid, PORT: '5000' }).PORT).toBe(5000);
  });

  it('lists every missing variable', () => {
    const { ANTHROPIC_API_KEY: _a, JWT_ACCESS_SECRET: _j, ...rest } = valid;
    expect(() => validateEnv(rest)).toThrow(
      /ANTHROPIC_API_KEY[\s\S]*JWT_ACCESS_SECRET|JWT_ACCESS_SECRET[\s\S]*ANTHROPIC_API_KEY/,
    );
  });

  it.each([
    ['DATABASE_URL', 'mysql://localhost/db'],
    ['JWT_ACCESS_SECRET', 'too-short'],
    ['CORS_ORIGIN', 'not a url'],
    ['ADMIN_EMAIL', 'not-an-email'],
    ['NODE_ENV', 'staging'],
  ])('rejects an invalid %s', (key, value) => {
    expect(() => validateEnv({ ...valid, [key]: value })).toThrow(key);
  });
});
