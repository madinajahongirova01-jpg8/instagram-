import { validateEnv } from './env.validation';

const base = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  MEDIA_URL_SECRET: 'b'.repeat(32),
};

describe('validateEnv', () => {
  it('applies safe defaults', () => {
    const env = validateEnv({ ...base });
    expect(env).toMatchObject({
      PORT: 4000,
      JWT_ACCESS_TTL_SECONDS: 900,
      REFRESH_TOKEN_TTL_DAYS: 30,
      COOKIE_SECURE: false,
      THROTTLE_ENABLED: true,
    });
  });

  it('parses numbers and booleans from strings', () => {
    const env = validateEnv({ ...base, PORT: '5000', COOKIE_SECURE: 'true', THROTTLE_ENABLED: 'false' });
    expect(env.PORT).toBe(5000);
    expect(env.COOKIE_SECURE).toBe(true);
    expect(env.THROTTLE_ENABLED).toBe(false);
  });

  it('rejects short secrets', () => {
    expect(() => validateEnv({ ...base, JWT_ACCESS_SECRET: 'short' })).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('requires DATABASE_URL', () => {
    const { DATABASE_URL: _omit, ...rest } = base;
    expect(() => validateEnv(rest)).toThrow(/DATABASE_URL/);
  });
});
